const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";
const TEMPLATE_PDF_URL = "templates/certificado_base.pdf";
const FONT_URLS = {
  regular: "assets/fonts/Montserrat-Regular.ttf",
  bold: "assets/fonts/Montserrat-Bold.ttf",
};

const CERT_CONFIG = {
  entidad: "Escuela Judicial \"Rodrigo Lara Bonilla\"",
  directora: "Gloria Andrea Mahecha Sánchez",
  oficio: "CJO22-5121",
  oficioFecha: "23 de noviembre de 2022",
  ciudad: "Bogotá, D. C.",
  titulo: "Certifica que",
  codigoPrefix: "EJRLB",
  codigoLength: 12,
  codigoIncludeYear: true,
  codigoLabel: "Código de verificación:",
  textoBase:
    "revisada la información disponible en nuestras bases de datos, archivos recopilados y con la información reportada por la Unidad de Administración de la Carrera Judicial mediante el Oficio No. {oficio} del {oficioFecha}, se estableció que, {nombre}, identificado(a) con documento de identidad No. {cedula}, aparece en los registros de los siguientes Cursos de Formación Judicial Inicial:",
  firma: "Directora Escuela Judicial \"Rodrigo Lara Bonilla\"",
  layout: {
    drawHeader: true,
    headerStartY: 640,
    headerLineGap: 18,
    headerTitleGap: 36,
    headerTextSize: 13,
    headerEntidadSize: 14,
    headerTituloSize: 15,
    marginX: 55,
    bodyStartY: 560,
    bodyFontSize: 11.5,
    bodyWidth: 485,
    tableStartY: 400,
    tableFontSize: 8.5,
    tableHeaderGap: 10,
    drawTableBorders: false,
    tableBorderOffset: 4,
    tableRowLineGap: 4,
    headerTextOffsetY: -6,
    rowTextOffsetY: -2,
    colNoX: 58,
    colCursoX: 85,
    colResultadoX: 420,
    colEspecialidadX: 485,
    signatureY: 148,
    signatureNameSize: 12,
    signatureRoleSize: 11,
    verificationY: 54,
    verificationSize: 8.5,
  },
};
