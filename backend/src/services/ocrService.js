const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs').promises;

class OCRService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.config = {
      languages: process.env.TESSERACT_LANG || 'spa+eng',
      confidenceThreshold: parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD) || 0.6,
      maxRetries: parseInt(process.env.OCR_MAX_RETRIES) || 3,
      timeout: parseInt(process.env.OCR_TIMEOUT) || 30000
    };
    
    // Cache para resultados OCR
    this.resultCache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 horas
  }

  async initialize() {
    try {
      if (this.worker) {
        await this.terminate();
      }

      this.worker = await Tesseract.createWorker({
        lang: this.config.languages,
        logger: m => {
          if (process.env.NODE_ENV === 'development') {
            console.log('OCR Progress:', m);
          }
        },
        errorHandler: (error) => {
          console.error('OCR Error:', error);
        }
      });
      
      this.isInitialized = true;
      console.log('✅ Servicio OCR inicializado exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error al inicializar OCR:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async terminate() {
    if (this.worker) {
      try {
        await this.worker.terminate();
        this.worker = null;
        this.isInitialized = false;
        console.log('✅ Servicio OCR terminado');
      } catch (error) {
        console.error('❌ Error al terminar OCR:', error);
      }
    }
  }

  async extractText(imagePath, options = {}) {
    if (!this.isInitialized || !this.worker) {
      throw new Error('Servicio OCR no inicializado');
    }

    const cacheKey = `${imagePath}-${JSON.stringify(options)}`;
    
    // Verificar cache
    if (this.resultCache.has(cacheKey)) {
      const cached = this.resultCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.result;
      }
      this.resultCache.delete(cacheKey);
    }

    try {
      const startTime = Date.now();
      
      const { data: { text, confidence } } = await this.worker.recognize(imagePath, {
        ...options,
        timeout: this.config.timeout
      });
      
      const processingTime = Date.now() - startTime;
      
      const result = {
        text,
        confidence: confidence / 100, // Normalizar a 0-1
        processingTime,
        timestamp: new Date()
      };
      
      // Guardar en cache
      this.resultCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
      
      // Limpiar cache si es muy grande
      if (this.resultCache.size > 100) {
        this.cleanCache();
      }
      
      return result;
    } catch (error) {
      console.error('Error al extraer texto:', error);
      throw new Error(`No se pudo extraer texto de la imagen: ${error.message}`);
    }
  }

  async validatePaymentProof(imagePath, expectedAmount, options = {}) {
    try {
      // Verificar que el archivo existe y es válido
      await this.validateImageFile(imagePath);
      
      // Extraer texto con reintentos
      let extractedData;
      for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
        try {
          const ocrResult = await this.extractText(imagePath, options);
          extractedData = this.extractPaymentData(ocrResult.text, expectedAmount);
          
          if (extractedData.confidence >= this.config.confidenceThreshold) {
            break;
          }
          
          if (attempt < this.config.maxRetries) {
            console.log(`Intento ${attempt} con baja confianza, reintentando...`);
            await this.delay(1000 * attempt); // Delay progresivo
          }
        } catch (error) {
          if (attempt === this.config.maxRetries) throw error;
          console.log(`Intento ${attempt} falló, reintentando...`);
          await this.delay(1000 * attempt);
        }
      }
      
      // Validar resultado final
      const validationResult = this.getValidationResult(extractedData, expectedAmount);
      
      return {
        success: true,
        extractedText: extractedData.cleanText,
        extractedData,
        validationResult,
        confidence: extractedData.confidence,
        processingTime: extractedData.processingTime || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        extractedText: '',
        extractedData: null,
        validationResult: null,
        confidence: 0,
        processingTime: 0
      };
    }
  }

  async validateImageFile(filePath) {
    try {
      // Verificar que el archivo existe
      await fs.access(filePath);
      
      // Verificar extensión del archivo
      const ext = path.extname(filePath).toLowerCase();
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'];
      
      if (!allowedExtensions.includes(ext)) {
        throw new Error(`Formato de archivo no soportado: ${ext}. Formatos permitidos: ${allowedExtensions.join(', ')}`);
      }

      // Verificar tamaño del archivo
      const stats = await fs.stat(filePath);
      const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB por defecto
      
      if (stats.size > maxSize) {
        throw new Error(`Archivo demasiado grande: ${(stats.size / 1024 / 1024).toFixed(2)}MB. Máximo permitido: ${(maxSize / 1024 / 1024).toFixed(2)}MB`);
      }

      return true;
    } catch (error) {
      throw new Error(`Error al validar archivo: ${error.message}`);
    }
  }

  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\.\,\$\-\+]/g, '')
      .trim();
  }

  extractPaymentData(text, expectedAmount) {
    const data = {
      amount: null,
      date: null,
      accountNumber: null,
      confidence: 0,
      cleanText: this.cleanText(text),
      processingTime: 0
    };

    let confidence = 0;

    // Extraer monto con patrones mejorados
    const amountPatterns = [
      /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*USD?/gi,
      /Monto[:\s]*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      /Total[:\s]*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      /Pago[:\s]*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      /Importe[:\s]*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi
    ];

    for (const pattern of amountPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        const amount = this.parseAmount(matches[0]);
        if (amount && this.isAmountValid(amount, expectedAmount)) {
          data.amount = amount;
          confidence += 35; // Aumentar peso del monto
          break;
        }
      }
    }

    // Extraer fecha con patrones mejorados
    const datePatterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
      /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g,
      /Fecha[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /(\d{1,2}\s+(?:Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)\s+\d{2,4})/gi
    ];

    for (const pattern of datePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        const date = this.parseDate(matches[0]);
        if (date && this.isDateValid(date)) {
          data.date = date;
          confidence += 25;
          break;
        }
      }
    }

    // Extraer número de cuenta con patrones mejorados
    const accountPatterns = [
      /Cuenta[:\s]*(\d{4,})/gi,
      /(\d{4,})/g,
      /Número[:\s]*(\d{4,})/gi,
      /CBU[:\s]*(\d{4,})/gi,
      /Alias[:\s]*([A-Za-z0-9]+)/gi
    ];

    for (const pattern of accountPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        const account = matches[0].replace(/\D/g, '');
        if (account.length >= 4) {
          data.accountNumber = account.slice(-4);
          confidence += 20;
          break;
        }
      }
    }

    // Validar que el monto coincida
    if (data.amount && this.isAmountValid(data.amount, expectedAmount)) {
      confidence += 20;
    }

    data.confidence = Math.min(confidence / 100, 1); // Normalizar a 0-1
    
    return data;
  }

  parseAmount(amountStr) {
    try {
      const cleanAmount = amountStr.replace(/[^\d,\.]/g, '');
      const normalizedAmount = cleanAmount.replace(',', '');
      const amount = parseFloat(normalizedAmount);
      return isNaN(amount) ? null : amount;
    } catch (error) {
      return null;
    }
  }

  parseDate(dateStr) {
    try {
      // Intentar diferentes formatos de fecha
      const formats = [
        'DD/MM/YYYY',
        'MM/DD/YYYY',
        'YYYY-MM-DD',
        'DD-MM-YYYY',
        'MM-DD-YYYY'
      ];

      for (const format of formats) {
        const date = this.parseDateByFormat(dateStr, format);
        if (date && !isNaN(date.getTime())) {
          return date;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  parseDateByFormat(dateStr, format) {
    try {
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length !== 3) return null;

      let day, month, year;

      if (format === 'DD/MM/YYYY' || format === 'DD-MM-YYYY') {
        [day, month, year] = parts;
      } else if (format === 'MM/DD/YYYY' || format === 'MM-DD-YYYY') {
        [month, day, year] = parts;
      } else if (format === 'YYYY-MM-DD') {
        [year, month, day] = parts;
      }

      // Normalizar año
      if (year.length === 2) {
        year = parseInt(year) < 50 ? `20${year}` : `19${year}`;
      }

      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } catch (error) {
      return null;
    }
  }

  isAmountValid(extractedAmount, expectedAmount) {
    const tolerance = parseFloat(process.env.AMOUNT_TOLERANCE) || 0.01; // Tolerancia configurable
    return Math.abs(extractedAmount - expectedAmount) <= tolerance;
  }

  isDateValid(date) {
    try {
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const oneMonthAhead = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      
      return date >= oneYearAgo && date <= oneMonthAhead;
    } catch (error) {
      return false;
    }
  }

  getValidationResult(extractedData, expectedAmount) {
    const { amount, date, accountNumber, confidence } = extractedData;
    
    let result = 'pendiente';
    let reason = '';
    let score = 0;

    // Calcular score basado en confianza y validaciones
    if (confidence >= 0.8) score += 40;
    else if (confidence >= 0.6) score += 25;
    else if (confidence >= 0.4) score += 15;

    if (amount && this.isAmountValid(amount, expectedAmount)) score += 30;
    if (date && this.isDateValid(date)) score += 20;
    if (accountNumber) score += 10;

    // Determinar resultado basado en score
    if (score >= 80) {
      if (amount && this.isAmountValid(amount, expectedAmount)) {
        result = 'aprobado';
        reason = 'Validación automática exitosa';
      } else {
        result = 'validando';
        reason = 'Monto no coincide, requiere revisión manual';
      }
    } else if (score >= 60) {
      result = 'validando';
      reason = 'Confianza media, requiere revisión manual';
    } else {
      result = 'validando';
      reason = 'Baja confianza, requiere revisión manual';
    }

    return {
      result,
      reason,
      score,
      confidence,
      extractedData
    };
  }

  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.resultCache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.resultCache.delete(key);
      }
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      cacheSize: this.resultCache.size,
      config: this.config
    };
  }
}

// Singleton instance
const ocrService = new OCRService();

module.exports = ocrService;
