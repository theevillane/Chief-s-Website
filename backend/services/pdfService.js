'use strict';

const PDFDocument = require('pdfkit');
const path        = require('path');
const fs          = require('fs');
const logger      = require('../utils/logger');

const PDF_DIR = process.env.PDF_STORAGE_PATH || path.join(__dirname, '../uploads/letters');

// Ensure output directory exists
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

const CHIEF_NAME     = process.env.CHIEF_NAME     || 'Chief John Otieno Otieno';
const CHIEF_TITLE    = process.env.CHIEF_TITLE    || 'Chief, Jimo East Location';
const LOCATION_NAME  = process.env.LOCATION_NAME  || 'Jimo East Location';

const LETTER_INTROS = {
  id_letter:  (name, village) =>
    `This is to certify that ${name}, holder of the National Identity Card bearing the details on record with this office, is a resident of ${village} Village, ${LOCATION_NAME}. This letter is issued for the purpose of confirming the identity of the above-named person for official use.`,
  residence:  (name, village) =>
    `This is to confirm that ${name} is a bona fide resident of ${village} Village, ${LOCATION_NAME}. The above-named person has been known to this office and is resident within the jurisdictional boundaries of Jimo East Location.`,
  school:     (name, village) =>
    `This is to support the school admission application of ${name}, a resident of ${village} Village, ${LOCATION_NAME}. This office confirms the above-named person is resident within the location and recommends their admission to the institution of their choice.`,
  conduct:    (name, village) =>
    `This is to certify that ${name}, a resident of ${village} Village, ${LOCATION_NAME}, is a person of good conduct and character as known to this office. No criminal record or community misconduct has been reported against the above-named person within the jurisdiction of this office.`,
  intro_id:   (name, village) =>
    `This letter introduces ${name} of ${village} Village, ${LOCATION_NAME}, who is applying for a Kenya National Identity Card for the first time. This office confirms that the above-named person is a bona fide resident of this location and recommends the issuance of a National Identity Card.`,
};

/**
 * Generate an official PDF letter and save it to disk.
 *
 * @param {object} request - ServiceRequest document
 * @returns {Promise<{filePath: string, fileName: string, fileUrl: string}>}
 */
const generateLetterPDF = (request) => {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `${request.ref_number.replace(/\//g, '-')}.pdf`;
      const filePath  = path.join(PDF_DIR, fileName);
      const fileUrl   = `/uploads/letters/${fileName}`;

      const doc = new PDFDocument({
        size:    'A4',
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        info: {
          Title:   `${request.type_label} - ${request.citizen_name}`,
          Author:  CHIEF_NAME,
          Subject: LOCATION_NAME,
        },
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // ── Colours ──────────────────────────────────────────────────────────────
      const FOREST  = '#1B4332';
      const GOLD    = '#D4A017';
      const INK     = '#1A1A1A';
      const INK_MID = '#3D3D3D';

      const pageW   = doc.page.width;
      const margins = { top: 72, left: 72, right: 72 };
      const usableW = pageW - margins.left - margins.right;

      // ── Header stripe (green) ─────────────────────────────────────────────────
      doc.rect(0, 0, pageW, 8).fill(FOREST);
      doc.rect(0, 8, pageW, 3).fill(GOLD);
      doc.rect(0, 11, pageW, 3).fill('#BB0000');  // Kenya flag colours

      let y = 30;

      // ── Republic of Kenya header ───────────────────────────────────────────────
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(FOREST)
        .text('REPUBLIC OF KENYA', { align: 'center' });
      y += 16;

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(INK)
        .text('OFFICE OF THE CHIEF', { align: 'center' });
      y = doc.y + 2;

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(INK_MID)
        .text(`${LOCATION_NAME} | National Government Administration Officers (NGAO)`, { align: 'center' });

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(INK_MID)
        .text('P.O. Box [XXX], Jimo East | Tel: 0700 XXX XXX | jimoeast@ngao.go.ke', { align: 'center' });

      // ── Divider ───────────────────────────────────────────────────────────────
      y = doc.y + 8;
      doc.moveTo(margins.left, y).lineTo(pageW - margins.right, y)
        .lineWidth(2).strokeColor(FOREST).stroke();
      doc.moveTo(margins.left, y + 3).lineTo(pageW - margins.right, y + 3)
        .lineWidth(0.5).strokeColor(GOLD).stroke();

      y += 16;

      // ── Reference & Date block ─────────────────────────────────────────────────
      doc.font('Helvetica').fontSize(9).fillColor(INK_MID);
      const issueDate = new Date().toLocaleDateString('en-KE', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
      doc
        .text(`Ref: ${request.ref_number}`, margins.left, y)
        .text(`Date: ${issueDate}`, { align: 'right' });

      y = doc.y + 20;

      // ── Letter title ─────────────────────────────────────────────────────────
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(FOREST)
        .text(request.type_label.toUpperCase(), { align: 'center', underline: true });

      y = doc.y + 20;

      // ── Salutation ────────────────────────────────────────────────────────────
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(INK)
        .text('TO WHOM IT MAY CONCERN,', margins.left, y);

      y = doc.y + 14;

      // ── Body paragraph ────────────────────────────────────────────────────────
      const introFn  = LETTER_INTROS[request.letter_type];
      const introText = introFn
        ? introFn(request.citizen_name, request.village)
        : `This is to certify that ${request.citizen_name} of ${request.village} Village, ${LOCATION_NAME}, is known to this office.`;

      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(INK)
        .text(introText, margins.left, y, { width: usableW, align: 'justify', lineGap: 4 });

      y = doc.y + 14;

      // ── Purpose paragraph ─────────────────────────────────────────────────────
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(INK)
        .text(
          `This letter is issued for the purpose of: ${request.purpose}.`,
          margins.left, y, { width: usableW, align: 'justify', lineGap: 4 }
        );

      if (request.destination) {
        y = doc.y + 10;
        doc
          .font('Helvetica')
          .fontSize(11)
          .fillColor(INK)
          .text(`Issued to: ${request.destination}`, margins.left, y);
      }

      y = doc.y + 14;

      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(INK)
        .text(
          'This letter is issued without prejudice and is valid for a period of three (3) months from the date of issue.',
          margins.left, y, { width: usableW, align: 'justify' }
        );

      // ── Signature block ───────────────────────────────────────────────────────
      y = doc.y + 40;
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(INK)
        .text('Issued by:', margins.left, y);

      y = doc.y + 36; // space for physical signature

      // Signature line
      doc
        .moveTo(margins.left, y)
        .lineTo(margins.left + 180, y)
        .lineWidth(1)
        .strokeColor(INK)
        .stroke();

      y += 6;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(FOREST)
        .text(CHIEF_NAME, margins.left, y);
      doc.font('Helvetica').fontSize(9).fillColor(INK_MID)
        .text(CHIEF_TITLE);
      doc.font('Helvetica').fontSize(9).fillColor(INK_MID)
        .text(`${LOCATION_NAME}, Republic of Kenya`);
      doc.font('Helvetica').fontSize(9).fillColor(INK_MID)
        .text(`Date: ${issueDate}`);

      // ── Circular stamp placeholder ────────────────────────────────────────────
      const stampX = pageW - margins.right - 90;
      const stampY = y;
      doc
        .circle(stampX, stampY + 36, 38)
        .lineWidth(2)
        .strokeColor(FOREST)
        .stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor(FOREST)
        .text('CHIEF', stampX - 14, stampY + 22)
        .text('JIMO EAST', stampX - 20, stampY + 32)
        .text('LOCATION', stampX - 18, stampY + 42)
        .text('OFFICIAL SEAL', stampX - 24, stampY + 52);

      // ── Verification footer ───────────────────────────────────────────────────
      const footerY = doc.page.height - 80;
      doc
        .moveTo(margins.left, footerY)
        .lineTo(pageW - margins.right, footerY)
        .lineWidth(0.5)
        .strokeColor('#CCCCCC')
        .stroke();

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#888888')
        .text(
          `This is an official document of the Office of the Chief, ${LOCATION_NAME}, Republic of Kenya.`,
          margins.left, footerY + 6, { width: usableW, align: 'center' }
        )
        .text(
          `Reference: ${request.ref_number} | Verify at: jimoeast.go.ke/verify | Issued: ${issueDate}`,
          margins.left, footerY + 18, { width: usableW, align: 'center' }
        );

      // ── Bottom stripe ─────────────────────────────────────────────────────────
      doc.rect(0, doc.page.height - 8, pageW, 8).fill(FOREST);

      doc.end();

      writeStream.on('finish', () => {
        logger.info(`PDF generated: ${fileName}`);
        resolve({ filePath, fileName, fileUrl });
      });
      writeStream.on('error', reject);

    } catch (err) {
      logger.error(`PDF generation error: ${err.message}`);
      reject(err);
    }
  });
};

/**
 * Delete a letter PDF from disk.
 * @param {string} filePath
 */
const deletePDF = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`PDF deleted: ${filePath}`);
    }
  } catch (err) {
    logger.warn(`Could not delete PDF ${filePath}: ${err.message}`);
  }
};

module.exports = { generateLetterPDF, deletePDF };
