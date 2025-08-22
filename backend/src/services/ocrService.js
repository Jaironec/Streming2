const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs').promises;

class OCRService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      this.worker = await Tesseract.createWorker({
        lang: process.env.TESSERACT_LANG || 'spa+eng',
        logger: m => {
          if (process.env.NODE_ENV === 'development') {
            console.log('OCR Progress:', m);
          }
        }
      });
      
      this.isInitialized = true;
      console.log('✅ Servicio OCR inicializado exitosamente');
    } catch (error) {
      console.error('❌ Error al inicializar OCR:', error);
      throw error;
    }
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  async extractText(imagePath) {
    if (!this.isInitialized || !this.worker) {
      throw new Error('Servicio OCR no inicializado');
    }

    try {
      const { data: { text } } = await this.worker.recognize(imagePath);
      return text;
    } catch (error) {
      console.error('Error al extraer texto:', error);
      throw new Error('No se pudo extraer texto de la imagen');
    }
  }

  async validatePaymentProof(imagePath, expectedAmount) {
    try {
      const extractedText = await this.extractText(imagePath);
      
      // Limpiar y normalizar el texto extraído
      const cleanText = this.cleanText(extractedText);
      
      // Extraer información del comprobante
      const extractedData = this.extractPaymentData(cleanText, expectedAmount);
      
      return {
        success: true,
        extractedText: cleanText,
        extractedData,
        confidence: extractedData.confidence
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        extractedText: '',
        extractedData: null,
        confidence: 0
      };
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
      confidence: 0
    };

    let confidence = 0;

    // Extraer monto
    const amountPatterns = [
      /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*USD?/gi,
      /Monto[:\s]*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      /Total[:\s]*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi
    ];

    for (const pattern of amountPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        const amount = this.parseAmount(matches[0]);
        if (amount && this.isAmountValid(amount, expectedAmount)) {
          data.amount = amount;
          confidence += 30;
          break;
        }
      }
    }

    // Extraer fecha
    const datePatterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
      /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g,
      /Fecha[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi
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

    // Extraer número de cuenta (últimos 4 dígitos)
    const accountPatterns = [
      /Cuenta[:\s]*(\d{4,})/gi,
      /(\d{4,})/g,
      /Número[:\s]*(\d{4,})/gi
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
      confidence += 25;
    }

    data.confidence = Math.min(confidence, 100);
    
    return data;
  }

  parseAmount(amountStr) {
    const cleanAmount = amountStr.replace(/[^\d,\.]/g, '');
    const normalizedAmount = cleanAmount.replace(',', '');
    const amount = parseFloat(normalizedAmount);
    return isNaN(amount) ? null : amount;
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
  }

  isAmountValid(extractedAmount, expectedAmount) {
    const tolerance = 0.01; // Tolerancia de 1 centavo
    return Math.abs(extractedAmount - expectedAmount) <= tolerance;
  }

  isDateValid(date) {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const oneMonthAhead = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    
    return date >= oneYearAgo && date <= oneMonthAhead;
  }

  async processImageFile(filePath) {
    try {
      // Verificar que el archivo existe
      await fs.access(filePath);
      
      // Verificar extensión del archivo
      const ext = path.extname(filePath).toLowerCase();
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.pdf'];
      
      if (!allowedExtensions.includes(ext)) {
        throw new Error('Formato de archivo no soportado');
      }

      // Para PDFs, necesitarías convertirlos a imagen primero
      // Por ahora solo procesamos imágenes
      if (ext === '.pdf') {
        throw new Error('Los archivos PDF no están soportados en esta versión');
      }

      return true;
    } catch (error) {
      throw new Error(`Error al procesar archivo: ${error.message}`);
    }
  }

  getValidationResult(extractedData, expectedAmount) {
    const { amount, date, accountNumber, confidence } = extractedData;
    
    let result = 'pendiente';
    let reason = '';

    if (confidence >= 80) {
      if (amount && this.isAmountValid(amount, expectedAmount)) {
        result = 'aprobado';
        reason = 'Validación automática exitosa';
      } else {
        result = 'validando';
        reason = 'Monto no coincide, requiere revisión manual';
      }
    } else if (confidence >= 50) {
      result = 'validando';
      reason = 'Confianza media, requiere revisión manual';
    } else {
      result = 'validando';
      reason = 'Baja confianza, requiere revisión manual';
    }

    return {
      result,
      reason,
      confidence,
      extractedData
    };
  }
}

// Singleton instance
const ocrService = new OCRService();

module.exports = ocrService;
