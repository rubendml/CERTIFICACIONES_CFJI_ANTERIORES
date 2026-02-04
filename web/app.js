const resultsSection = document.getElementById("results");
const resultsContent = document.getElementById("results-content");
const resultCount = document.getElementById("result-count");
const detailSection = document.getElementById("detail");
const detailContent = document.getElementById("detail-content");
const downloadButton = document.getElementById("download-pdf");

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentPerson = null;
let currentRows = [];

const formatCedula = (value) => {
  if (!value) return "";
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const normalizeQuery = (value) => value.trim();

const isNumericQuery = (value) => {
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 && /^\d+$/.test(digits);
};

const toRowsByCedula = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    const key = row.cedula;
    if (!map.has(key)) {
      map.set(key, {
        cedula: row.cedula,
        nombre: row.nombre,
        registros: [],
      });
    }
    map.get(key).registros.push(row);
  });
  return Array.from(map.values());
};

const renderResults = (groups) => {
  resultsContent.innerHTML = "";
  resultCount.textContent = `${groups.length} persona(s)`;

  if (groups.length === 0) {
    resultsContent.innerHTML = "<p>No se encontraron registros.</p>";
    return;
  }

  groups.forEach((group) => {
    const card = document.createElement("div");
    card.className = "person-card";

    const meta = document.createElement("div");
    meta.className = "person-meta";
    meta.innerHTML = `
      <strong>${group.nombre || "Sin nombre"}</strong>
      <span>Cédula: ${formatCedula(group.cedula)}</span>
      <span>${group.registros.length} registro(s)</span>
    `;

    const button = document.createElement("button");
    button.className = "secondary";
    button.textContent = "Ver detalle";
    button.addEventListener("click", () => {
      currentPerson = group;
      currentRows = group.registros;
      renderDetail(group);
    });

    card.appendChild(meta);
    card.appendChild(button);
    resultsContent.appendChild(card);
  });
};

const renderDetail = (group) => {
  detailContent.innerHTML = "";
  detailSection.classList.remove("hidden");

  const info = document.createElement("div");
  info.innerHTML = `
    <p><strong>${group.nombre || "Sin nombre"}</strong></p>
    <p>Cédula: ${formatCedula(group.cedula)}</p>
  `;

  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Resultado final</th>
        <th>Especialidad</th>
        <th>Curso de Formación Judicial Inicial</th>
        <th>Convocatoria</th>
      </tr>
    </thead>
    <tbody>
      ${group.registros
        .map(
          (row) => `
        <tr>
          <td>${row.puntaje ?? ""}</td>
          <td>${row.especialidad ?? ""}</td>
          <td>${row.curso_formacion ?? ""}</td>
          <td>${row.convocatoria ?? ""}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  `;

  detailContent.appendChild(info);
  detailContent.appendChild(table);
};

const wrapText = (text, maxWidth, font, fontSize) => {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const testLine = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width <= maxWidth) {
      current = testLine;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });

  if (current) lines.push(current);
  return lines;
};

const drawCenteredText = (page, text, y, font, size, color, opacity) => {
  const pageWidth = page.getWidth();
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (pageWidth - textWidth) / 2,
    y,
    size,
    font,
    color,
    opacity,
  });
};

const drawJustifiedLine = (page, line, x, y, font, size, maxWidth, color, opacity) => {
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    page.drawText(line, { x, y, size, font, color, opacity });
    return;
  }

  const wordsWidth = words.reduce((sum, word) => sum + font.widthOfTextAtSize(word, size), 0);
  const baseSpace = font.widthOfTextAtSize(" ", size);
  const extraSpace = maxWidth - wordsWidth - baseSpace * (words.length - 1);
  const extraPerSpace = extraSpace > 0 ? extraSpace / (words.length - 1) : 0;

  let cursorX = x;
  words.forEach((word, index) => {
    page.drawText(word, { x: cursorX, y, size, font, color, opacity });
    if (index < words.length - 1) {
      cursorX += font.widthOfTextAtSize(word, size) + baseSpace + extraPerSpace;
    }
  });
};

const drawJustifiedParagraph = (page, lines, x, y, font, size, maxWidth, lineHeight, color, opacity) => {
  lines.forEach((line, index) => {
    if (index === lines.length - 1) {
      page.drawText(line, { x, y, size, font, color, opacity });
    } else {
      drawJustifiedLine(page, line, x, y, font, size, maxWidth, color, opacity);
    }
    y -= lineHeight;
  });
  return y;
};

const buildVerificationCode = async (group) => {
  const prefix = CERT_CONFIG.codigoPrefix || "CFJI";
  const length = CERT_CONFIG.codigoLength ?? 12;
  const includeYear = CERT_CONFIG.codigoIncludeYear ?? true;
  const registros = (group.registros || []).map((row) => row.registro_hash || "").sort();
  const payload = `${group.cedula || ""}|${registros.join("|")}`;

  if (window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const digest = await window.crypto.subtle.digest("SHA-256", encoder.encode(payload));
    const hashArray = Array.from(new Uint8Array(digest));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const code = hex.slice(0, length);
    return includeYear ? `${prefix}-${new Date().getFullYear()}-${code}` : `${prefix}-${code}`;
  }

  const fallback = Math.abs(payload.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0));
  const code = String(fallback).padStart(length, "0").slice(0, length);
  return includeYear ? `${prefix}-${new Date().getFullYear()}-${code}` : `${prefix}-${code}`;
};

const generateCertificate = async (group) => {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  let pdfDoc;
  let templateMode = false;

  if (typeof TEMPLATE_PDF_URL !== "undefined" && TEMPLATE_PDF_URL) {
    const templateUrl = `${TEMPLATE_PDF_URL}${TEMPLATE_PDF_URL.includes("?") ? "&" : "?"}v=${Date.now()}`;
    const templateBytes = await fetch(templateUrl).then((res) => res.arrayBuffer());
    pdfDoc = await PDFDocument.load(templateBytes);
    templateMode = true;
  } else {
    pdfDoc = await PDFDocument.create();
  }

  let page = templateMode ? pdfDoc.getPage(0) : pdfDoc.addPage([595.28, 841.89]);
  let font;
  let boldFont;

  const fontUrls = typeof FONT_URLS !== "undefined" ? FONT_URLS : null;
  if (fontUrls?.regular && fontUrls?.bold && window.fontkit) {
    pdfDoc.registerFontkit(window.fontkit);
    const [regularBytes, boldBytes] = await Promise.all([
      fetch(fontUrls.regular).then((res) => res.arrayBuffer()),
      fetch(fontUrls.bold).then((res) => res.arrayBuffer()),
    ]);
    font = await pdfDoc.embedFont(regularBytes);
    boldFont = await pdfDoc.embedFont(boldBytes);
  } else {
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  const layout = CERT_CONFIG.layout || {};
  const margin = layout.marginX ?? 50;
  const bodyFontSize = layout.bodyFontSize ?? 12;
  const tableFontSize = layout.tableFontSize ?? 8;
  const lineHeight = layout.bodyLineHeight ?? 16;

  const textColor = rgb(0, 0, 0);
  const textOpacity = 1;

  if (layout.drawHeader !== false) {
    let headerY = layout.headerStartY ?? 640;
    const headerLineGap = layout.headerLineGap ?? 18;
    const headerTitleGap = layout.headerTitleGap ?? 28;
    const headerTextSize = layout.headerTextSize ?? 12;
    const headerEntidadSize = layout.headerEntidadSize ?? 13;
    const headerTituloSize = layout.headerTituloSize ?? 14;

    drawCenteredText(page, "La suscrita directora de la", headerY, font, headerTextSize, textColor, textOpacity);
    headerY -= headerLineGap;
    drawCenteredText(page, CERT_CONFIG.entidad, headerY, boldFont, headerEntidadSize, textColor, textOpacity);
    headerY -= headerTitleGap;
    drawCenteredText(page, CERT_CONFIG.titulo, headerY, boldFont, headerTituloSize, textColor, textOpacity);
  }

  let y = layout.bodyStartY ?? 560;

  const tratamiento = group.registros?.[0]?.tratamiento || CERT_CONFIG.tratamiento || "la persona";
  const bodyText = CERT_CONFIG.textoBase
    .replace("{oficio}", CERT_CONFIG.oficio)
    .replace("{oficioFecha}", CERT_CONFIG.oficioFecha)
    .replace("{tratamiento}", tratamiento)
    .replace("{nombre}", group.nombre || "")
    .replace("{cedula}", formatCedula(group.cedula));

  const bodyWidth = layout.bodyWidth ?? page.getWidth() - margin * 2;
  const bodyLines = wrapText(bodyText, bodyWidth, font, bodyFontSize);
  y = drawJustifiedParagraph(page, bodyLines, margin, y, font, bodyFontSize, bodyWidth, lineHeight, textColor, textOpacity);

  y -= 10;
  y = layout.tableStartY ?? y;

  const headers = ["No.", "Curso de Formación Judicial Inicial", "Resultado", "Especialidad"];
  const colWidths = [24, 320, 70, 90];
  const tableX = margin;
  const tableBorderOffset = layout.tableBorderOffset ?? 4;
  const tableHeaderGap = layout.tableHeaderGap ?? 8;
  const drawTableBorders = layout.drawTableBorders !== false;
  const rowLineGap = layout.tableRowLineGap ?? 4;
  const headerTextOffsetY = layout.headerTextOffsetY ?? 0;
  const rowTextOffsetY = layout.rowTextOffsetY ?? 0;

  const colNoX = layout.colNoX ?? tableX;
  const colCursoX = layout.colCursoX ?? tableX + colWidths[0];
  const colResultadoX = layout.colResultadoX ?? tableX + colWidths[0] + colWidths[1];
  const colEspecialidadX = layout.colEspecialidadX ?? tableX + colWidths[0] + colWidths[1] + colWidths[2];
  const tableRightX = layout.tableRightX ?? colEspecialidadX + colWidths[3];

  const drawLine = (x1, y1, x2, y2) => {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 0.6,
      color: textColor,
      opacity: textOpacity,
    });
  };

  let tableTopLineY = null;
  let tableBottomLineY = null;

  const drawTableHeader = () => {
    const headerTextY = y + headerTextOffsetY;
    page.drawText(headers[0], { x: colNoX, y: headerTextY, size: tableFontSize, font: boldFont, color: textColor, opacity: textOpacity });
    page.drawText(headers[1], { x: colCursoX, y: headerTextY, size: tableFontSize, font: boldFont, color: textColor, opacity: textOpacity });
    page.drawText(headers[2], { x: colResultadoX, y: headerTextY, size: tableFontSize, font: boldFont, color: textColor, opacity: textOpacity });
    page.drawText(headers[3], { x: colEspecialidadX, y: headerTextY, size: tableFontSize, font: boldFont, color: textColor, opacity: textOpacity });
    if (drawTableBorders) {
      const headerTop = y + tableBorderOffset;
      const headerBottom = y - 14 - tableBorderOffset;
      drawLine(tableX, headerTop, tableRightX, headerTop);
      drawLine(tableX, headerBottom, tableRightX, headerBottom);
      tableTopLineY = headerTop;
      tableBottomLineY = headerBottom;
    }
    y -= 14 + tableHeaderGap;
  };

  drawTableHeader();

  for (const [index, row] of group.registros.entries()) {
    const puntaje = row.puntaje ?? "";
    const especialidad = row.especialidad ?? "";
    const curso = row.curso_formacion ?? "";

    const cursoLines = wrapText(curso, colWidths[1], font, tableFontSize);
    const especialidadLines = wrapText(especialidad, colWidths[3], font, tableFontSize);
    const rowHeight = Math.max(cursoLines.length, especialidadLines.length, 1) * 12;

    if (y - rowHeight < 90) {
      if (templateMode) {
        const [templatePage] = await pdfDoc.copyPages(pdfDoc, [0]);
        page = pdfDoc.addPage(templatePage);
      } else {
        page = pdfDoc.addPage([595.28, 841.89]);
        drawCenteredText(page, "Continuación", 785, boldFont, 12);
      }
      y = layout.tableStartY ?? 470;
      drawTableHeader();
    }

    const rowTextY = y + rowTextOffsetY;
    page.drawText(String(index + 1), { x: colNoX, y: rowTextY, size: tableFontSize, font, color: textColor, opacity: textOpacity });
    page.drawText(String(puntaje), { x: colResultadoX, y: rowTextY, size: tableFontSize, font, color: textColor, opacity: textOpacity });

    cursoLines.forEach((line, index) => {
      page.drawText(line, {
        x: colCursoX,
        y: rowTextY - index * 12,
        size: tableFontSize,
        font,
        color: textColor,
        opacity: textOpacity,
      });
    });

    especialidadLines.forEach((line, index) => {
      page.drawText(line, {
        x: colEspecialidadX,
        y: rowTextY - index * 12,
        size: tableFontSize,
        font,
        color: textColor,
        opacity: textOpacity,
      });
    });

    if (drawTableBorders) {
      const rowBottom = y - rowHeight - rowLineGap;
      drawLine(tableX, rowBottom, tableRightX, rowBottom);
      tableBottomLineY = rowBottom;
    }

    y -= rowHeight + 8;
  }

  if (drawTableBorders && tableTopLineY !== null && tableBottomLineY !== null) {
    drawLine(tableX, tableTopLineY, tableX, tableBottomLineY);
    drawLine(colCursoX, tableTopLineY, colCursoX, tableBottomLineY);
    drawLine(colResultadoX, tableTopLineY, colResultadoX, tableBottomLineY);
    drawLine(colEspecialidadX, tableTopLineY, colEspecialidadX, tableBottomLineY);
    drawLine(tableRightX, tableTopLineY, tableRightX, tableBottomLineY);
  }

  y = layout.signatureY ?? y - 24;
  const signatureNameSize = layout.signatureNameSize ?? 11;
  const signatureRoleSize = layout.signatureRoleSize ?? 10;
  drawCenteredText(page, CERT_CONFIG.directora, y, boldFont, signatureNameSize, textColor, textOpacity);
  drawCenteredText(page, CERT_CONFIG.firma, y - 14, font, signatureRoleSize, textColor, textOpacity);

  const verificationCode = await buildVerificationCode(group);
  const verificationLabel = CERT_CONFIG.codigoLabel || "Código de verificación:";
  const verificationY = layout.verificationY ?? y - 36;
  const verificationSize = layout.verificationSize ?? 9.5;
  const verificationText = `${verificationLabel} ${verificationCode}`;
  const verificationWidth = font.widthOfTextAtSize(verificationText, verificationSize);
  const verificationX = page.getWidth() - margin - verificationWidth;
  page.drawText(verificationText, {
    x: verificationX,
    y: verificationY,
    size: verificationSize,
    font,
    color: textColor,
    opacity: textOpacity,
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `certificado_${group.cedula}.pdf`;
  link.click();

  URL.revokeObjectURL(url);
};

const searchForm = document.getElementById("search-form");
searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  detailSection.classList.add("hidden");

  const query = normalizeQuery(document.getElementById("query").value);
  if (!query) return;

  let response;
  if (isNumericQuery(query)) {
    const cedula = query.replace(/\D/g, "");
    response = await supabaseClient
      .from("certificados_cfji")
      .select("*")
      .eq("cedula", cedula)
      .order("curso_formacion", { ascending: true });
  } else {
    response = await supabaseClient
      .from("certificados_cfji")
      .select("*")
      .ilike("nombre", `%${query}%`)
      .order("nombre", { ascending: true });
  }

  if (response.error) {
    resultsSection.classList.remove("hidden");
    resultsContent.innerHTML = `<p>Error consultando Supabase: ${response.error.message}</p>`;
    return;
  }

  const groups = toRowsByCedula(response.data || []);
  resultsSection.classList.remove("hidden");
  renderResults(groups);
});

downloadButton.addEventListener("click", async () => {
  if (!currentPerson) return;
  await generateCertificate(currentPerson);
});
