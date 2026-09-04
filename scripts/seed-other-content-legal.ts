/**
 * Ensure editorial_content_module includes 'other', seed Privacy Policy + Terms of Service
 * (en / zh-CN / es), and refresh privacy_preference.summary with legal-page links.
 *
 * Usage: npx tsx scripts/seed-other-content-legal.ts
 */
import '@/lib/env';

import postgres from 'postgres';

const OTHER_BOARD_KEY = 'other';
const LOCALES = ['en', 'zh-CN', 'es'] as const;

type LocaleCode = (typeof LOCALES)[number];

type LocaleCopy = {
  title: string;
  summary: string;
  seoTitle: string;
  seoDescription: string;
  body: string;
};

type LegalDoc = {
  slug: string;
  locales: Record<LocaleCode, LocaleCopy>;
};

const privacyPolicy: LegalDoc = {
  slug: 'privacy-policy',
  locales: {
    en: {
      title: 'Privacy Policy',
      summary:
        'This Privacy Policy explains how Hongyu Medical collects, uses, stores, and protects personal information when you visit our websites or contact us.',
      seoTitle: 'Privacy Policy | Hongyu Medical',
      seoDescription:
        'Learn how Hongyu Medical handles personal data, cookies, and your privacy rights when you use our websites and related services.',
      body: [
        '<p><em>Last updated: March 2026</em></p>',
        '<p>Hongyu Medical (“Hongyu”, “we”, “us”, or “our”) respects your privacy. This Privacy Policy describes how we process personal information in connection with our websites, contact forms, newsletters, cookie preference tools, and related online services (collectively, the “Services”).</p>',
        '<h2>1. Who we are</h2>',
        '<p>Hongyu Medical operates medical technology and education-related websites. If you have questions about this Policy, please use the Contact Us page on our website.</p>',
        '<h2>2. Information we collect</h2>',
        '<p>Depending on how you interact with the Services, we may collect:</p>',
        '<ul>',
        '<li><strong>Information you provide</strong>: name, email address, phone number, organization, role, message content, and other details submitted through inquiry or contact forms.</li>',
        '<li><strong>Account or learning-related data</strong> (where applicable): login identifiers, course progress, exam records, and certificate information associated with our academy offerings.</li>',
        '<li><strong>Technical and usage data</strong>: IP address, browser type, device information, language preference, referring pages, and pages viewed.</li>',
        '<li><strong>Cookie and similar technologies</strong>: identifiers needed for site operation and, with your consent, analytics or marketing preferences.</li>',
        '</ul>',
        '<h2>3. How we use information</h2>',
        '<p>We use personal information to:</p>',
        '<ul>',
        '<li>Operate, secure, and improve the Services;</li>',
        '<li>Respond to inquiries and provide requested information or support;</li>',
        '<li>Manage language preference, sessions, and essential site functions;</li>',
        '<li>Deliver academy, newsletter, or other features you request;</li>',
        '<li>Analyze aggregated usage to improve content and user experience (where permitted);</li>',
        '<li>Comply with legal obligations and protect our rights.</li>',
        '</ul>',
        '<h2>4. Legal bases (where applicable)</h2>',
        '<p>Where required by law (for example under the GDPR), we process personal data based on one or more of the following: performance of a contract or pre-contractual steps, legitimate interests (such as securing and improving our Services), consent (such as non-essential cookies), or compliance with a legal obligation.</p>',
        '<h2>5. Cookies and similar technologies</h2>',
        '<p>We use necessary cookies to keep the site working (for example language preference and signed-in sessions). Statistics and marketing cookies are used only with your consent. You can manage preferences at any time via “Privacy Settings” in the website footer. For more detail, see the privacy preference panel on this site.</p>',
        '<h2>6. Sharing of information</h2>',
        '<p>We do not sell your personal information. We may share information with:</p>',
        '<ul>',
        '<li>Service providers who host, email, analyze, or support the Services under appropriate agreements;</li>',
        '<li>Professional advisors or authorities when required by law or to protect rights and safety;</li>',
        '<li>Successors in connection with a corporate transaction, subject to applicable protections.</li>',
        '</ul>',
        '<h2>7. International transfers</h2>',
        '<p>Our Services may be accessed or supported from different countries. Where we transfer personal information internationally, we take steps designed to provide an appropriate level of protection consistent with applicable law.</p>',
        '<h2>8. Retention</h2>',
        '<p>We retain personal information only as long as needed for the purposes described in this Policy, including to meet legal, accounting, or reporting requirements, resolve disputes, and enforce agreements.</p>',
        '<h2>9. Security</h2>',
        '<p>We implement technical and organizational measures designed to protect personal information. No method of transmission or storage is completely secure; please use strong credentials and contact us if you suspect unauthorized access.</p>',
        '<h2>10. Your rights</h2>',
        '<p>Depending on your location, you may have rights to access, correct, delete, restrict, or object to certain processing, withdraw consent, or lodge a complaint with a supervisory authority. To exercise rights, contact us through the website. We may need to verify your identity before responding.</p>',
        '<h2>11. Children</h2>',
        '<p>The Services are not directed to children, and we do not knowingly collect personal information from children where prohibited by law.</p>',
        '<h2>12. Changes to this Policy</h2>',
        '<p>We may update this Privacy Policy from time to time. The “Last updated” date at the top will change when we do. Continued use of the Services after an update means you acknowledge the revised Policy.</p>',
        '<h2>13. Contact</h2>',
        '<p>For privacy-related questions, please use Contact Us on the Hongyu Medical website, or the contact details published in our company information pages.</p>',
      ].join(''),
    },
    'zh-CN': {
      title: '隐私政策',
      summary:
        '本隐私政策说明宏宇医疗在您访问网站或与我们联系时，如何收集、使用、存储与保护个人信息。',
      seoTitle: '隐私政策 | 宏宇医疗',
      seoDescription: '了解宏宇医疗如何处理个人数据、Cookie 以及您在使用网站及相关服务时的隐私权利。',
      body: [
        '<p><em>最后更新：2026 年 3 月</em></p>',
        '<p>宏宇医疗（“宏宇”“我们”）重视您的隐私。本隐私政策说明我们在运营网站、联系表单、通讯订阅、Cookie 偏好工具及相关在线服务（合称“服务”）过程中如何处理个人信息。</p>',
        '<h2>1. 我们是谁</h2>',
        '<p>宏宇医疗运营医疗技术与教育相关网站。如对本政策有疑问，请通过网站「联系我们」与我们沟通。</p>',
        '<h2>2. 我们收集的信息</h2>',
        '<p>根据您与服务的交互方式，我们可能收集：</p>',
        '<ul>',
        '<li><strong>您主动提供的信息</strong>：姓名、电子邮箱、电话、机构、职位、留言内容，以及通过询盘或联系表单提交的其他信息。</li>',
        '<li><strong>账户或学习相关数据</strong>（如适用）：登录标识、课程进度、考试记录，以及学院相关证书信息。</li>',
        '<li><strong>技术与使用数据</strong>：IP 地址、浏览器类型、设备信息、语言偏好、来源页面与浏览页面等。</li>',
        '<li><strong>Cookie 及同类技术</strong>：保障站点运行所需的标识，以及在征得同意后用于分析或营销偏好的标识。</li>',
        '</ul>',
        '<h2>3. 我们如何使用信息</h2>',
        '<p>我们使用个人信息用于：</p>',
        '<ul>',
        '<li>运营、保障并改进服务；</li>',
        '<li>回复咨询并提供您请求的信息或支持；</li>',
        '<li>管理语言偏好、登录会话与必要站点功能；</li>',
        '<li>提供您请求的学院、通讯或其他功能；</li>',
        '<li>在允许范围内分析汇总使用情况以改进内容与体验；</li>',
        '<li>遵守法律义务并保护我们的合法权利。</li>',
        '</ul>',
        '<h2>4. 处理依据（如适用）</h2>',
        '<p>在适用法律要求时（例如 GDPR），我们可能基于合同履行或缔约前步骤、合法利益（如保障与改进服务）、同意（如非必要 Cookie）或法定义务处理个人数据。</p>',
        '<h2>5. Cookie 及同类技术</h2>',
        '<p>我们使用必要 Cookie 保障网站运行（例如语言偏好与登录会话）。统计与营销 Cookie 仅在征得您同意后使用。您可随时通过页脚「隐私偏好设置」管理选择。更多说明见本站隐私偏好面板。</p>',
        '<h2>6. 信息共享</h2>',
        '<p>我们不会出售您的个人信息。我们可能在以下情形共享信息：</p>',
        '<ul>',
        '<li>在适当协议约束下，向托管、邮件、分析或支持服务的供应商共享；</li>',
        '<li>在法律要求或为保护权利与安全时，向专业顾问或主管机关提供；</li>',
        '<li>在公司交易中向承继方提供，并受适用保护措施约束。</li>',
        '</ul>',
        '<h2>7. 跨境传输</h2>',
        '<p>我们的服务可能在不同国家被访问或提供支持。在进行跨境传输时，我们会采取与适用法律相符的适当保护措施。</p>',
        '<h2>8. 保存期限</h2>',
        '<p>我们仅在实现本政策所述目的所需期间内保留个人信息，包括满足法律、会计或报告要求、解决争议及执行协议。</p>',
        '<h2>9. 安全</h2>',
        '<p>我们采取合理的技术与组织措施保护个人信息。任何传输或存储方式都无法保证绝对安全；请使用强密码，如怀疑未经授权访问请及时联系我们。</p>',
        '<h2>10. 您的权利</h2>',
        '<p>根据您所在地区，您可能享有查阅、更正、删除、限制或反对特定处理、撤回同意，或向监管机构投诉等权利。行使权利请通过网站联系我们；我们可能需核实身份后再行回复。</p>',
        '<h2>11. 儿童</h2>',
        '<p>本服务不以儿童为对象；在法律禁止的情况下，我们不会故意收集儿童的个人信息。</p>',
        '<h2>12. 政策变更</h2>',
        '<p>我们可能不时更新本隐私政策。更新时将修改文首「最后更新」日期。更新后继续使用服务，即表示您知悉修订后的政策。</p>',
        '<h2>13. 联系方式</h2>',
        '<p>隐私相关问题，请通过宏宇医疗网站「联系我们」或公司信息页面公布的联系方式与我们沟通。</p>',
      ].join(''),
    },
    es: {
      title: 'Política de privacidad',
      summary:
        'Esta Política de privacidad explica cómo Hongyu Medical recopila, usa, almacena y protege la información personal cuando visita nuestros sitios web o se pone en contacto con nosotros.',
      seoTitle: 'Política de privacidad | Hongyu Medical',
      seoDescription:
        'Conozca cómo Hongyu Medical trata los datos personales, las cookies y sus derechos de privacidad al usar nuestros sitios y servicios relacionados.',
      body: [
        '<p><em>Última actualización: marzo de 2026</em></p>',
        '<p>Hongyu Medical (“Hongyu”, “nosotros” o “nuestro”) respeta su privacidad. Esta Política describe cómo tratamos la información personal en relación con nuestros sitios web, formularios de contacto, boletines, herramientas de preferencias de cookies y servicios en línea relacionados (los “Servicios”).</p>',
        '<h2>1. Quiénes somos</h2>',
        '<p>Hongyu Medical opera sitios web relacionados con tecnología médica y educación. Si tiene preguntas sobre esta Política, use la página Contacto de nuestro sitio web.</p>',
        '<h2>2. Información que recopilamos</h2>',
        '<p>Según cómo interactúe con los Servicios, podemos recopilar:</p>',
        '<ul>',
        '<li><strong>Información que usted proporciona</strong>: nombre, correo electrónico, teléfono, organización, cargo, contenido del mensaje y otros datos enviados mediante formularios.</li>',
        '<li><strong>Datos de cuenta o aprendizaje</strong> (si aplica): identificadores de acceso, progreso del curso, registros de exámenes e información de certificados de la academia.</li>',
        '<li><strong>Datos técnicos y de uso</strong>: dirección IP, tipo de navegador, dispositivo, idioma, páginas de referencia y páginas visitadas.</li>',
        '<li><strong>Cookies y tecnologías similares</strong>: identificadores necesarios para el funcionamiento del sitio y, con su consentimiento, preferencias de análisis o marketing.</li>',
        '</ul>',
        '<h2>3. Cómo usamos la información</h2>',
        '<p>Usamos la información personal para:</p>',
        '<ul>',
        '<li>Operar, proteger y mejorar los Servicios;</li>',
        '<li>Responder consultas y prestar la información o el soporte solicitados;</li>',
        '<li>Gestionar el idioma, las sesiones y las funciones esenciales del sitio;</li>',
        '<li>Ofrecer la academia, el boletín u otras funciones que solicite;</li>',
        '<li>Analizar el uso agregado para mejorar el contenido (cuando esté permitido);</li>',
        '<li>Cumplir obligaciones legales y proteger nuestros derechos.</li>',
        '</ul>',
        '<h2>4. Bases legales (cuando aplique)</h2>',
        '<p>Cuando lo exija la ley (por ejemplo, el RGPD), tratamos datos personales sobre la base del contrato o medidas precontractuales, intereses legítimos, consentimiento (cookies no esenciales) o una obligación legal.</p>',
        '<h2>5. Cookies y tecnologías similares</h2>',
        '<p>Usamos cookies necesarias para el funcionamiento del sitio (por ejemplo, idioma y sesión). Las cookies de estadísticas y marketing solo se usan con su consentimiento. Puede gestionar sus preferencias en cualquier momento desde «Configuración de privacidad» en el pie de página.</p>',
        '<h2>6. Compartición de información</h2>',
        '<p>No vendemos su información personal. Podemos compartirla con proveedores de servicios, asesores o autoridades cuando la ley lo exija, y en operaciones corporativas con las protecciones aplicables.</p>',
        '<h2>7. Transferencias internacionales</h2>',
        '<p>Los Servicios pueden accederse o respaldarse desde distintos países. Cuando transferimos información personal internacionalmente, adoptamos medidas para ofrecer un nivel de protección adecuado conforme a la ley aplicable.</p>',
        '<h2>8. Conservación</h2>',
        '<p>Conservamos la información personal solo durante el tiempo necesario para los fines descritos en esta Política, incluidos requisitos legales, contables o de información.</p>',
        '<h2>9. Seguridad</h2>',
        '<p>Aplicamos medidas técnicas y organizativas razonables para proteger la información personal. Ningún método de transmisión o almacenamiento es completamente seguro.</p>',
        '<h2>10. Sus derechos</h2>',
        '<p>Según su ubicación, puede tener derechos de acceso, rectificación, eliminación, limitación u oposición, retirar el consentimiento o presentar una reclamación ante una autoridad de control. Contáctenos a través del sitio web para ejercerlos.</p>',
        '<h2>11. Menores</h2>',
        '<p>Los Servicios no están dirigidos a menores y no recopilamos a sabiendas información personal de menores cuando la ley lo prohíbe.</p>',
        '<h2>12. Cambios</h2>',
        '<p>Podemos actualizar esta Política periódicamente. La fecha de «Última actualización» cambiará cuando lo hagamos.</p>',
        '<h2>13. Contacto</h2>',
        '<p>Para cuestiones de privacidad, use Contacto en el sitio web de Hongyu Medical o los datos publicados en nuestras páginas de información corporativa.</p>',
      ].join(''),
    },
  },
};

const termsOfService: LegalDoc = {
  slug: 'terms-of-service',
  locales: {
    en: {
      title: 'Terms of Service',
      summary:
        'These Terms of Service govern your access to and use of Hongyu Medical websites and related online services.',
      seoTitle: 'Terms of Service | Hongyu Medical',
      seoDescription:
        'Read the terms that apply when you browse Hongyu Medical websites, submit inquiries, or use related online features.',
      body: [
        '<p><em>Last updated: March 2026</em></p>',
        '<p>These Terms of Service (“Terms”) govern your access to and use of websites and online services operated by Hongyu Medical (“Hongyu”, “we”, “us”, or “our”). By accessing or using the Services, you agree to these Terms. If you do not agree, do not use the Services.</p>',
        '<h2>1. Eligibility and accounts</h2>',
        '<p>You must be able to form a binding contract under applicable law to use certain features. If you create an account (for example for academy access), you are responsible for safeguarding credentials and for activity under your account. Notify us promptly of unauthorized use.</p>',
        '<h2>2. Acceptable use</h2>',
        '<p>You agree not to:</p>',
        '<ul>',
        '<li>Use the Services in any unlawful, harmful, or fraudulent manner;</li>',
        '<li>Attempt to gain unauthorized access to systems, data, or other users’ accounts;</li>',
        '<li>Interfere with or disrupt the Services, including by introducing malware;</li>',
        '<li>Scrape, harvest, or misuse content except as expressly permitted;</li>',
        '<li>Misrepresent your identity or affiliation when contacting us.</li>',
        '</ul>',
        '<h2>3. Informational content; no medical advice</h2>',
        '<p>Content on the Services (including product information, educational materials, articles, and certificates) is provided for general informational and professional education purposes. It is <strong>not</strong> a substitute for professional medical advice, diagnosis, or treatment, and does not create a clinician–patient relationship. Always seek the advice of qualified healthcare professionals for clinical decisions.</p>',
        '<h2>4. Inquiries and communications</h2>',
        '<p>If you submit an inquiry or other communication, you represent that the information is accurate and that you are authorized to provide it. We may respond using the contact details you provide. Submitting a form does not guarantee a specific commercial outcome.</p>',
        '<h2>5. Intellectual property</h2>',
        '<p>Unless otherwise stated, the Services and their content (including text, graphics, logos, videos, and software) are owned by Hongyu or its licensors and are protected by intellectual property laws. You may view and temporarily download materials for personal, non-commercial use related to evaluating our offerings, provided you do not remove notices or create derivative works without permission. All other rights are reserved.</p>',
        '<h2>6. Third-party links and services</h2>',
        '<p>The Services may link to third-party websites or tools. We are not responsible for third-party content, policies, or practices. Your use of third-party services is at your own risk and subject to their terms.</p>',
        '<h2>7. Academy and certificates</h2>',
        '<p>Where we offer courses, exams, or certificates, additional rules may apply (for example completion requirements and academic integrity). Certificates confirm completion of our stated program criteria; they do not constitute a professional license or regulatory approval unless expressly stated.</p>',
        '<h2>8. Disclaimers</h2>',
        '<p>THE SERVICES AND ALL CONTENT ARE PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT, TO THE MAXIMUM EXTENT PERMITTED BY LAW. We do not warrant that the Services will be uninterrupted, error-free, or free of harmful components.</p>',
        '<h2>9. Limitation of liability</h2>',
        '<p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, HONGYU AND ITS AFFILIATES WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICES. OUR AGGREGATE LIABILITY FOR CLAIMS RELATING TO THE SERVICES WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US (IF ANY) FOR THE SPECIFIC SERVICE GIVING RISE TO THE CLAIM IN THE TWELVE MONTHS BEFORE THE CLAIM, OR (B) ONE HUNDRED US DOLLARS (USD 100), EXCEPT WHERE LIABILITY CANNOT BE LIMITED UNDER APPLICABLE LAW.</p>',
        '<h2>10. Indemnity</h2>',
        '<p>You agree to defend and indemnify Hongyu and its affiliates against claims arising from your misuse of the Services, your violation of these Terms, or your infringement of third-party rights, to the extent permitted by law.</p>',
        '<h2>11. Privacy</h2>',
        '<p>Our collection and use of personal information is described in our <a href="/pages/privacy-policy">Privacy Policy</a>. By using the Services, you acknowledge that Policy.</p>',
        '<h2>12. Changes</h2>',
        '<p>We may modify the Services or these Terms. Material changes will be reflected by updating the “Last updated” date. Continued use after changes become effective constitutes acceptance of the revised Terms.</p>',
        '<h2>13. Termination</h2>',
        '<p>We may suspend or terminate access to the Services if you violate these Terms or if we discontinue a feature. Provisions that by nature should survive (including intellectual property, disclaimers, and limitations of liability) will survive termination.</p>',
        '<h2>14. Governing law</h2>',
        '<p>These Terms are governed by the laws applicable to Hongyu Medical’s principal place of business, without regard to conflict-of-law principles, except where mandatory consumer protection laws of your country provide otherwise.</p>',
        '<h2>15. Contact</h2>',
        '<p>Questions about these Terms may be sent via Contact Us on the Hongyu Medical website.</p>',
      ].join(''),
    },
    'zh-CN': {
      title: '服务条款',
      summary: '本服务条款规范您对宏宇医疗网站及相关在线服务的访问与使用。',
      seoTitle: '服务条款 | 宏宇医疗',
      seoDescription: '了解浏览宏宇医疗网站、提交询盘或使用相关在线功能时应遵守的条款。',
      body: [
        '<p><em>最后更新：2026 年 3 月</em></p>',
        '<p>本服务条款（“条款”）规范您对宏宇医疗（“宏宇”“我们”）运营的网站与在线服务（“服务”）的访问与使用。访问或使用服务即表示您同意本条款；如不同意，请勿使用服务。</p>',
        '<h2>1. 资格与账户</h2>',
        '<p>使用部分功能时，您须具备适用法律下订立有约束力合同的能力。如创建账户（例如学院访问），您须妥善保管凭证并对账户下的活动负责。发现未经授权使用请及时通知我们。</p>',
        '<h2>2. 可接受使用</h2>',
        '<p>您同意不得：</p>',
        '<ul>',
        '<li>以任何违法、有害或欺诈方式使用服务；</li>',
        '<li>试图未经授权访问系统、数据或其他用户账户；</li>',
        '<li>干扰或破坏服务，包括植入恶意软件；</li>',
        '<li>在未获明确允许的情况下抓取、收集或滥用内容；</li>',
        '<li>在联系我们时虚假陈述身份或从属关系。</li>',
        '</ul>',
        '<h2>3. 信息性内容；非医疗建议</h2>',
        '<p>服务上的内容（包括产品信息、教育材料、文章与证书）仅供一般信息与专业教育用途，<strong>不构成</strong>专业医疗建议、诊断或治疗，亦不建立医患关系。临床决策请咨询具备资质的医疗专业人员。</p>',
        '<h2>4. 询盘与通信</h2>',
        '<p>提交询盘或其他通信时，您声明信息准确且您有权提供。我们可能使用您提供的联系方式回复。提交表单并不保证特定商业结果。</p>',
        '<h2>5. 知识产权</h2>',
        '<p>除非另有说明，服务及其内容归宏宇或其许可方所有，并受知识产权法律保护。您可为评估我们产品与服务而进行个人、非商业性的浏览与临时下载，但不得去除权利声明或未经许可制作衍生作品。其余权利予以保留。</p>',
        '<h2>6. 第三方链接与服务</h2>',
        '<p>服务可能链接至第三方网站或工具。我们对第三方内容、政策或做法不承担责任。使用第三方服务的风险由您自行承担，并受其条款约束。</p>',
        '<h2>7. 学院与证书</h2>',
        '<p>如我们提供课程、考试或证书，可能适用额外规则（例如完成要求与学术诚信）。证书仅确认满足我们载明的项目标准；除非明确说明，不构成专业执业许可或监管批准。</p>',
        '<h2>8. 免责声明</h2>',
        '<p>在法律允许的最大范围内，服务及全部内容按「现状」和「可用」提供，不作任何明示或默示保证，包括适销性、特定用途适用性与非侵权。我们不保证服务不中断、无错误或无有害组件。</p>',
        '<h2>9. 责任限制</h2>',
        '<p>在法律允许的最大范围内，宏宇及其关联方不对因使用服务产生的任何间接、附带、特殊、后果性或惩罚性损害，或利润、数据、商誉损失承担责任。与服务相关的索赔的累计责任不超过：(A) 索赔发生前十二个月内您就相关服务向我们支付的金额（如有），或 (B) 一百美元（USD 100）中的较高者，但适用法律禁止限制的责任除外。</p>',
        '<h2>10. 赔偿</h2>',
        '<p>在法律允许范围内，您同意就因滥用服务、违反本条款或侵犯第三方权利而产生的索赔，为宏宇及其关联方进行抗辩并予以赔偿。</p>',
        '<h2>11. 隐私</h2>',
        '<p>我们如何收集与使用个人信息见 <a href="/pages/privacy-policy">隐私政策</a>。使用服务即表示您知悉该政策。</p>',
        '<h2>12. 变更</h2>',
        '<p>我们可能修改服务或本条款。重大变更将通过更新「最后更新」日期体现。变更生效后继续使用服务，即表示接受修订后的条款。</p>',
        '<h2>13. 终止</h2>',
        '<p>如您违反本条款或我们停用某项功能，我们可暂停或终止对服务的访问。依性质应继续有效的条款（包括知识产权、免责声明与责任限制）在终止后仍然有效。</p>',
        '<h2>14. 适用法律</h2>',
        '<p>本条款受宏宇医疗主要营业地适用法律管辖，不考虑法律冲突原则；但您所在国强制性消费者保护法律另有规定的除外。</p>',
        '<h2>15. 联系方式</h2>',
        '<p>有关本条款的问题，请通过宏宇医疗网站「联系我们」与我们沟通。</p>',
      ].join(''),
    },
    es: {
      title: 'Términos de servicio',
      summary:
        'Estos Términos de servicio rigen su acceso y uso de los sitios web de Hongyu Medical y los servicios en línea relacionados.',
      seoTitle: 'Términos de servicio | Hongyu Medical',
      seoDescription:
        'Lea los términos aplicables cuando navega por los sitios de Hongyu Medical, envía consultas o usa funciones en línea relacionadas.',
      body: [
        '<p><em>Última actualización: marzo de 2026</em></p>',
        '<p>Estos Términos de servicio (“Términos”) rigen su acceso y uso de los sitios web y servicios en línea operados por Hongyu Medical (“Hongyu”, “nosotros” o “nuestro”). Al acceder o usar los Servicios, acepta estos Términos. Si no está de acuerdo, no use los Servicios.</p>',
        '<h2>1. Elegibilidad y cuentas</h2>',
        '<p>Debe poder celebrar un contrato vinculante según la ley aplicable para usar ciertas funciones. Si crea una cuenta (por ejemplo, para la academia), es responsable de proteger las credenciales y de la actividad bajo su cuenta.</p>',
        '<h2>2. Uso aceptable</h2>',
        '<p>Usted acepta no:</p>',
        '<ul>',
        '<li>Usar los Servicios de forma ilegal, dañina o fraudulenta;</li>',
        '<li>Intentar obtener acceso no autorizado a sistemas, datos u otras cuentas;</li>',
        '<li>Interferir o interrumpir los Servicios, incluido el malware;</li>',
        '<li>Extraer o hacer un uso indebido del contenido salvo que se permita expresamente;</li>',
        '<li>Falsear su identidad o afiliación al contactarnos.</li>',
        '</ul>',
        '<h2>3. Contenido informativo; sin consejo médico</h2>',
        '<p>El contenido de los Servicios (incluida información de productos, materiales educativos, artículos y certificados) se ofrece con fines informativos y de educación profesional general. <strong>No</strong> sustituye el consejo, diagnóstico o tratamiento médico profesional y no crea una relación clínico-paciente.</p>',
        '<h2>4. Consultas y comunicaciones</h2>',
        '<p>Si envía una consulta u otra comunicación, declara que la información es exacta y que está autorizado a proporcionarla. Enviar un formulario no garantiza un resultado comercial específico.</p>',
        '<h2>5. Propiedad intelectual</h2>',
        '<p>Salvo que se indique lo contrario, los Servicios y su contenido pertenecen a Hongyu o a sus licenciantes y están protegidos por las leyes de propiedad intelectual. Puede ver y descargar temporalmente materiales para uso personal y no comercial relacionado con la evaluación de nuestras ofertas, sin eliminar avisos ni crear obras derivadas sin permiso.</p>',
        '<h2>6. Enlaces y servicios de terceros</h2>',
        '<p>Los Servicios pueden enlazar a sitios o herramientas de terceros. No somos responsables de su contenido, políticas o prácticas.</p>',
        '<h2>7. Academia y certificados</h2>',
        '<p>Cuando ofrezcamos cursos, exámenes o certificados, pueden aplicarse reglas adicionales. Los certificados confirman el cumplimiento de nuestros criterios; no constituyen una licencia profesional ni una aprobación regulatoria salvo que se indique expresamente.</p>',
        '<h2>8. Exenciones de responsabilidad</h2>',
        '<p>LOS SERVICIOS Y TODO EL CONTENIDO SE PROPORCIONAN “TAL CUAL” Y “SEGÚN DISPONIBILIDAD”, SIN GARANTÍAS DE NINGÚN TIPO, EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY.</p>',
        '<h2>9. Limitación de responsabilidad</h2>',
        '<p>EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, HONGYU Y SUS AFILIADAS NO SERÁN RESPONSABLES DE DAÑOS INDIRECTOS, INCIDENTALES, ESPECIALES, CONSECUENTES O PUNITIVOS, NI DE PÉRDIDA DE BENEFICIOS, DATOS O FONDO DE COMERCIO. NUESTRA RESPONSABILIDAD AGREGADA NO EXCEDERÁ EL MAYOR ENTRE (A) LOS IMPORTES QUE NOS HAYA PAGADO (SI LOS HUBIERA) POR EL SERVICIO ESPECÍFICO EN LOS DOCE MESES ANTERIORES A LA RECLAMACIÓN, O (B) CIEN DÓLARES ESTADOUNIDENSES (USD 100), SALVO DONDE LA LEY PROHÍBA LIMITARLA.</p>',
        '<h2>10. Indemnización</h2>',
        '<p>Usted acepta defender e indemnizar a Hongyu y sus afiliadas frente a reclamaciones derivadas de un uso indebido de los Servicios, la violación de estos Términos o la infracción de derechos de terceros, en la medida permitida por la ley.</p>',
        '<h2>11. Privacidad</h2>',
        '<p>Nuestra recopilación y uso de información personal se describe en la <a href="/pages/privacy-policy">Política de privacidad</a>.</p>',
        '<h2>12. Cambios</h2>',
        '<p>Podemos modificar los Servicios o estos Términos. Los cambios materiales se reflejarán actualizando la fecha de «Última actualización».</p>',
        '<h2>13. Terminación</h2>',
        '<p>Podemos suspender o terminar el acceso si viola estos Términos o si discontinuamos una función.</p>',
        '<h2>14. Ley aplicable</h2>',
        '<p>Estos Términos se rigen por las leyes aplicables al domicilio principal de Hongyu Medical, sin perjuicio de las normas imperativas de protección al consumidor de su país.</p>',
        '<h2>15. Contacto</h2>',
        '<p>Las preguntas sobre estos Términos pueden enviarse mediante Contacto en el sitio web de Hongyu Medical.</p>',
      ].join(''),
    },
  },
};

const PRIVACY_PREFERENCE = {
  locales: {
    'zh-CN': {
      title: 'Cookie 使用说明',
      summary: [
        '<p>本站使用 Cookie 以保障网站正常运行（例如语言偏好与登录会话），并在征得您同意后用于访问分析与体验优化。您可接受全部、拒绝非必要项，或按类别保存设置。</p>',
        '<p>您可随时通过页脚「隐私偏好设置」更改选择。完整说明请参阅我们的',
        '<a href="/pages/privacy-policy">隐私政策</a>',
        '与',
        '<a href="/pages/terms-of-service">服务条款</a>',
        '。</p>',
      ].join(''),
      detailHtml: [
        '<p>宏宇医疗网站可能使用以下几类技术：</p>',
        '<ul>',
        '<li><strong>必要 Cookie</strong>：用于语言切换、登录会话与基础安全，网站核心功能依赖此类 Cookie，无法关闭。</li>',
        '<li><strong>统计与营销 Cookie</strong>：仅在您同意后启用，用于了解站点使用情况并改进内容与服务。当前站点尚未接入第三方追踪脚本，您的选择会被保存，以便将来启用时生效。</li>',
        '</ul>',
        '<p>您可随时通过页脚「隐私偏好设置」重新打开本面板。详情见',
        '<a href="/pages/privacy-policy">隐私政策</a>',
        '。</p>',
      ].join(''),
    },
    en: {
      title: 'Use of Cookies',
      summary: [
        '<p>This website uses cookies to keep the site working properly (for example language preference and signed-in sessions) and, with your consent, to understand how visitors use the site and improve the experience. You can accept all cookies, reject non-essential cookies, or save settings by category.</p>',
        '<p>You may change your choice at any time via “Privacy Settings” in the footer. For full details, see our ',
        '<a href="/pages/privacy-policy">Privacy Policy</a>',
        ' and ',
        '<a href="/pages/terms-of-service">Terms of Service</a>',
        '.</p>',
      ].join(''),
      detailHtml: [
        '<p>Hongyu Medical may use the following categories:</p>',
        '<ul>',
        '<li><strong>Necessary cookies</strong>: required for language preference, login sessions, and basic security. These are always active.</li>',
        '<li><strong>Statistics and marketing cookies</strong>: used only with your consent to measure usage and improve content and services. Third-party tracking scripts are not loaded yet; your preference is stored so it can apply when analytics are enabled later.</li>',
        '</ul>',
        '<p>You can reopen this panel anytime from “Privacy Settings” in the footer. See our ',
        '<a href="/pages/privacy-policy">Privacy Policy</a>',
        ' for more information.</p>',
      ].join(''),
    },
    es: {
      title: 'Uso de cookies',
      summary: [
        '<p>Este sitio utiliza cookies para el funcionamiento básico (por ejemplo, el idioma y la sesión de inicio) y, con su consentimiento, para analizar el uso y mejorar la experiencia. Puede aceptar todas, rechazar las no esenciales o guardar ajustes por categoría.</p>',
        '<p>Puede cambiar su elección en cualquier momento desde «Configuración de privacidad» en el pie de página. Para más detalles, consulte nuestra ',
        '<a href="/pages/privacy-policy">Política de privacidad</a>',
        ' y los ',
        '<a href="/pages/terms-of-service">Términos de servicio</a>',
        '.</p>',
      ].join(''),
      detailHtml: [
        '<p>Hongyu Medical puede utilizar las siguientes categorías:</p>',
        '<ul>',
        '<li><strong>Cookies necesarias</strong>: imprescindibles para el idioma, la sesión de acceso y la seguridad básica. Siempre activas.</li>',
        '<li><strong>Cookies de estadísticas y marketing</strong>: solo con su consentimiento, para medir el uso y mejorar el contenido. Aún no se cargan scripts de terceros; su preferencia se guarda para aplicarla cuando se activen.</li>',
        '</ul>',
        '<p>Puede volver a abrir este panel desde «Configuración de privacidad» en el pie de página. Más información en la ',
        '<a href="/pages/privacy-policy">Política de privacidad</a>',
        '.</p>',
      ].join(''),
    },
  },
} as const;

async function ensureOtherModuleEnum(sql: postgres.Sql) {
  await sql.unsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'editorial_content_module'
          AND e.enumlabel = 'other'
      ) THEN
        ALTER TYPE editorial_content_module ADD VALUE 'other';
      END IF;
    END
    $$;
  `);
  console.log('editorial_content_module includes other');
}

async function upsertLegalDoc(sql: postgres.Sql, doc: LegalDoc) {
  const existing = await sql<{ content_id: string }[]>`
    SELECT ect.content_id
    FROM editorial_content_translations ect
    INNER JOIN editorial_contents ec ON ec.id = ect.content_id
    WHERE ect.content_module = 'other'
      AND ect.slug = ${doc.slug}
      AND ect.locale = 'en'
    LIMIT 1
  `;

  let contentId = existing[0]?.content_id;

  if (!contentId) {
    const inserted = await sql<{ id: string }[]>`
      INSERT INTO editorial_contents (
        content_type, content_module, board_key, cover_image, cover_mode, cover_value,
        status, published_at, created_at, updated_at
      )
      VALUES (
        'content', 'other', ${OTHER_BOARD_KEY}, '', '', '',
        'published', NOW(), NOW(), NOW()
      )
      RETURNING id
    `;
    contentId = inserted[0]!.id;
    console.log(`Created content ${doc.slug} -> ${contentId}`);
  } else {
    await sql`
      UPDATE editorial_contents
      SET content_module = 'other',
          board_key = ${OTHER_BOARD_KEY},
          status = 'published',
          published_at = COALESCE(published_at, NOW()),
          updated_at = NOW()
      WHERE id = ${contentId}
    `;
    await sql`
      DELETE FROM editorial_content_boards WHERE content_id = ${contentId}
    `;
    console.log(`Updated content ${doc.slug} -> ${contentId}`);
  }

  for (const locale of LOCALES) {
    const copy = doc.locales[locale];
    const payload = JSON.stringify({
      body: copy.body,
      coverStyle: null,
      tags: [],
      relatedProductSlugs: [],
      authorName: null,
      authorTitle: null,
      authorBio: null,
      category: null,
    });

    const existingTranslation = await sql<{ id: string }[]>`
      SELECT id FROM editorial_content_translations
      WHERE content_id = ${contentId} AND locale = ${locale}
      LIMIT 1
    `;

    if (existingTranslation[0]?.id) {
      await sql`
        UPDATE editorial_content_translations
        SET content_module = 'other',
            title = ${copy.title},
            slug = ${doc.slug},
            summary = ${copy.summary},
            seo_title = ${copy.seoTitle},
            seo_description = ${copy.seoDescription},
            payload = ${payload}::jsonb,
            updated_at = NOW()
        WHERE id = ${existingTranslation[0].id}
      `;
      console.log(`  upserted translation ${locale} (update)`);
    } else {
      await sql`
        INSERT INTO editorial_content_translations (
          content_id, content_type, content_module, locale, title, slug, summary,
          seo_title, seo_description, payload, created_at, updated_at
        )
        VALUES (
          ${contentId}, 'content', 'other', ${locale}, ${copy.title}, ${doc.slug}, ${copy.summary},
          ${copy.seoTitle}, ${copy.seoDescription}, ${payload}::jsonb, NOW(), NOW()
        )
      `;
      console.log(`  upserted translation ${locale} (insert)`);
    }
  }
}

async function updatePrivacyPreference(sql: postgres.Sql) {
  await sql`
    ALTER TABLE website_configs
    ADD COLUMN IF NOT EXISTS privacy_preference jsonb NOT NULL DEFAULT '{"locales":{}}'::jsonb
  `;

  const rows = await sql<{ id: string }[]>`
    SELECT id FROM website_configs LIMIT 1
  `;

  const payload = JSON.stringify(PRIVACY_PREFERENCE);

  if (!rows.length) {
    await sql`
      INSERT INTO website_configs (privacy_preference)
      VALUES (${payload}::jsonb)
    `;
    console.log('Inserted website_configs with privacy_preference');
  } else {
    await sql`
      UPDATE website_configs
      SET privacy_preference = ${payload}::jsonb,
          updated_at = NOW()
      WHERE id = ${rows[0].id}
    `;
    console.log(`Updated privacy_preference for ${rows[0].id}`);
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    await ensureOtherModuleEnum(sql);
    await upsertLegalDoc(sql, privacyPolicy);
    await upsertLegalDoc(sql, termsOfService);
    await updatePrivacyPreference(sql);
    console.log('Done.');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
