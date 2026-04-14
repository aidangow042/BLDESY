export const sharedStyles = `
  <style>
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 14px;
      line-height: 1.7;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 30px;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #0d9488;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header .brand {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 28px;
      font-weight: 900;
      color: #0d9488;
      letter-spacing: 2px;
      margin: 0;
    }
    .header .doc-title {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 10px 0 5px 0;
    }
    .header .meta {
      font-size: 12px;
      color: #666;
      margin: 4px 0;
    }
    h2 {
      font-size: 17px;
      color: #0d9488;
      margin-top: 28px;
      margin-bottom: 10px;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 4px;
    }
    h3 {
      font-size: 15px;
      color: #333;
      margin-top: 18px;
      margin-bottom: 6px;
    }
    p, li {
      margin-bottom: 8px;
      text-align: justify;
    }
    ul, ol {
      padding-left: 24px;
    }
    ol ol {
      list-style-type: lower-alpha;
    }
    ol ol ol {
      list-style-type: lower-roman;
    }
    .contact-box {
      background: #f0fdfa;
      border: 1px solid #0d9488;
      border-radius: 6px;
      padding: 16px 20px;
      margin-top: 24px;
    }
    .contact-box p {
      margin: 4px 0;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #999;
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }
  </style>
`;

export const makeHeader = (title: string) => `
  <div class="header">
    <p class="brand">BLDESY!</p>
    <p class="doc-title">${title}</p>
    <p class="meta">Last updated: 1 March 2026</p>
    <p class="meta">BLDESY Pty Ltd &mdash; ABN 00 000 000 000</p>
  </div>
`;

export const footer = `
  <div class="footer">
    &copy; 2026 BLDESY Pty Ltd. All rights reserved.
  </div>
`;
