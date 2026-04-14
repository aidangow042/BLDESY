import { sharedStyles, makeHeader, footer } from './styles';

export const privacyPolicy = {
  title: 'Privacy Policy',
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${sharedStyles}
</head>
<body>
  ${makeHeader('Privacy Policy')}

  <p>BLDESY Pty Ltd (ABN 00 000 000 000) ("BLDESY!", "we", "us", or "our") is committed to protecting your privacy and handling your personal information in accordance with the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles ("APPs"). This Privacy Policy explains how we collect, use, disclose, store, and protect your personal information when you use the BLDESY! mobile application, website, and related services (collectively, the "Platform").</p>

  <h2>1. Types of Data Collected</h2>
  <h3>1.1. Personal Information</h3>
  <p>When you create an account or use the Platform, we may collect the following personal information:</p>
  <ol type="a">
    <li>Full name;</li>
    <li>Email address;</li>
    <li>Phone number;</li>
    <li>Residential or business address, suburb, and postcode;</li>
    <li>Profile photograph;</li>
    <li>For Builders: trade qualifications, licence numbers, ABN, insurance details, business name, portfolio images, service area and radius, and trade categories;</li>
    <li>Job posting details (description of work required, urgency, preferred timing, budget range);</li>
    <li>Communications you send through the Platform (messages, applications, reviews);</li>
    <li>Payment information (processed by Stripe; we do not store full card details — see Section 5).</li>
  </ol>
  <h3>1.2. Usage Data</h3>
  <p>We automatically collect information about how you interact with the Platform, including:</p>
  <ol type="a">
    <li>Pages and screens viewed, features used, and actions taken;</li>
    <li>Search queries (trade types, locations, keywords);</li>
    <li>Date and time of access, session duration, and frequency of use;</li>
    <li>Referring URLs or app sources;</li>
    <li>Interaction with Builder profiles, job postings, and search results.</li>
  </ol>
  <h3>1.3. Device Information</h3>
  <p>We may collect information about the device you use to access the Platform, including:</p>
  <ol type="a">
    <li>Device type, model, and manufacturer;</li>
    <li>Operating system and version;</li>
    <li>Unique device identifiers;</li>
    <li>App version;</li>
    <li>IP address;</li>
    <li>Browser type and version (for web access);</li>
    <li>Screen resolution and display settings.</li>
  </ol>
  <h3>1.4. Location Data</h3>
  <p>With your consent, we may collect your precise or approximate geographic location through:</p>
  <ol type="a">
    <li>GPS data from your mobile device;</li>
    <li>Wi-Fi access points and cell tower triangulation;</li>
    <li>IP address geolocation;</li>
    <li>Suburb and postcode you provide during registration or job posting.</li>
  </ol>
  <p>Location data is used to show you nearby Builders, display relevant search results, and power the interactive map feature. You can disable location services in your device settings at any time, though this may limit certain Platform features.</p>

  <h2>2. How Data Is Collected</h2>
  <p>We collect personal information through the following means:</p>
  <ol type="a">
    <li><strong>Registration and profile creation:</strong> When you create an account, set up a Builder profile, or update your profile information;</li>
    <li><strong>Platform usage:</strong> When you search for Builders, post jobs, submit applications, send messages, write reviews, save profiles, or interact with any other Platform feature;</li>
    <li><strong>Cookies and local storage:</strong> We use session tokens, authentication tokens, and local storage to maintain your login state, remember your preferences, and improve your experience (see our Cookie &amp; Tracking Policy);</li>
    <li><strong>Third-party services:</strong> We may receive information from third-party services integrated with the Platform, including Supabase (authentication and database hosting) and Stripe (payment processing);</li>
    <li><strong>Direct communications:</strong> When you contact us via email, in-app support, or other channels;</li>
    <li><strong>AI Assist interactions:</strong> When you use the AI Assist feature, your queries and the responses generated are processed to provide the service. Conversation content may be retained to improve service quality.</li>
  </ol>

  <h2>3. Purpose of Data Use</h2>
  <p>We use your personal information for the following purposes:</p>
  <ol type="a">
    <li><strong>Providing the service:</strong> To create and manage your account, display Builder profiles, process search queries, match Customers with Builders, facilitate job postings and applications, process payments, and deliver AI Assist responses;</li>
    <li><strong>Improving user experience:</strong> To analyse usage patterns, optimise search results, personalise content, diagnose technical issues, and develop new features;</li>
    <li><strong>Communications:</strong> To send service-related notifications (account verification, job application updates, subscription confirmations), marketing communications (only with your consent, which you may withdraw at any time), and important notices about changes to our Terms or policies;</li>
    <li><strong>Safety and security:</strong> To detect, prevent, and address fraud, abuse, security incidents, and violations of our Terms; to verify Builder identities and qualifications; and to protect the rights, property, and safety of our users and the public;</li>
    <li><strong>Legal obligations:</strong> To comply with applicable laws, regulations, legal processes, and governmental requests, including the <em>Privacy Act 1988</em> (Cth), tax laws, and consumer protection laws;</li>
    <li><strong>Analytics and research:</strong> To conduct anonymised and aggregated statistical analysis to understand market trends, user behaviour, and Platform performance.</li>
  </ol>

  <h2>4. Data Sharing and Disclosure</h2>
  <p>4.1. <strong>We never sell your personal information.</strong> We do not sell, rent, lease, or trade your personal information to any third party for their marketing or commercial purposes.</p>
  <p>4.2. We may share your personal information with the following categories of recipients, solely for the purposes described in this Privacy Policy:</p>
  <ol type="a">
    <li><strong>Supabase (database and authentication hosting):</strong> Your account data, profile information, and Platform data are stored in Supabase infrastructure hosted in the Sydney, Australia (ap-southeast-2) region. Supabase acts as our data processor and is contractually bound to protect your data;</li>
    <li><strong>Stripe (payment processing):</strong> When you make a payment, your payment details are transmitted directly to Stripe for processing. We receive only a tokenised reference and transaction confirmation. Stripe is PCI-DSS Level 1 certified;</li>
    <li><strong>Anthropic (AI services):</strong> When you use the AI Assist feature, your queries are processed through a Supabase Edge Function that communicates with Anthropic's Claude API. Queries are processed in real time and are subject to Anthropic's data handling policies;</li>
    <li><strong>Other users:</strong> Certain information in your profile (e.g., Builder profile details, reviews, ratings) is visible to other users of the Platform as part of the normal operation of the service;</li>
    <li><strong>Law enforcement and government authorities:</strong> We may disclose your personal information if required to do so by law, subpoena, court order, or other legal process, or if we reasonably believe that disclosure is necessary to protect the rights, property, or safety of BLDESY!, our users, or the public;</li>
    <li><strong>Professional advisers:</strong> We may share information with our legal, accounting, and insurance advisers for the purpose of obtaining professional advice;</li>
    <li><strong>Business transfers:</strong> In connection with a merger, acquisition, reorganisation, asset sale, or similar transaction, your personal information may be transferred to the acquiring entity, subject to the same privacy protections as described in this Privacy Policy.</li>
  </ol>
  <p>4.3. We require all third-party service providers to implement appropriate technical and organisational measures to protect your personal information and to process it only in accordance with our instructions.</p>

  <h2>5. Data Retention</h2>
  <p>5.1. <strong>Active accounts:</strong> We retain your personal information for as long as your account remains active and as necessary to provide you with the Platform's services.</p>
  <p>5.2. <strong>Deleted accounts:</strong> If you request deletion of your account, we will retain your personal information for a period of thirty (30) days following the deletion request to allow for account recovery. After thirty (30) days, your personal information will be permanently purged from our active systems.</p>
  <p>5.3. <strong>Backup retention:</strong> Residual copies of your data may persist in encrypted backup systems for a limited period (not exceeding ninety (90) days) following purging from active systems, after which they will be permanently deleted.</p>
  <p>5.4. <strong>Anonymised data:</strong> Anonymised and aggregated analytics data that cannot be used to identify you may be retained indefinitely for research, statistical analysis, and Platform improvement purposes.</p>
  <p>5.5. <strong>Legal obligations:</strong> We may retain certain information for longer periods where required by applicable law, including tax records (minimum five (5) years), transaction records, and data necessary for the establishment, exercise, or defence of legal claims.</p>

  <h2>6. Data Security</h2>
  <p>We implement robust technical and organisational security measures to protect your personal information against unauthorised access, disclosure, alteration, loss, and destruction, including:</p>
  <ol type="a">
    <li><strong>Encryption in transit:</strong> All data transmitted between your device and our servers is encrypted using Transport Layer Security (TLS 1.2 or higher);</li>
    <li><strong>Encryption at rest:</strong> All personal data stored in our databases is encrypted at rest using AES-256 encryption;</li>
    <li><strong>Hosting location:</strong> All Platform data is hosted on Supabase infrastructure in the Sydney, Australia (ap-southeast-2) region;</li>
    <li><strong>Access controls:</strong> We implement strict role-based access controls and the principle of least privilege for all internal access to personal data;</li>
    <li><strong>Row-level security:</strong> Our database implements row-level security (RLS) policies to ensure users can only access data they are authorised to view;</li>
    <li><strong>Authentication security:</strong> User passwords are hashed using industry-standard algorithms and are never stored in plain text;</li>
    <li><strong>Regular reviews:</strong> We regularly review and update our security practices to address emerging threats and vulnerabilities.</li>
  </ol>
  <p>While we take reasonable steps to protect your personal information, no method of transmission over the Internet or method of electronic storage is completely secure. We cannot guarantee absolute security.</p>

  <h2>7. Your Rights Under the Australian Privacy Act 1988</h2>
  <p>Under the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles, you have the following rights with respect to your personal information:</p>
  <ol type="a">
    <li><strong>Right of access:</strong> You have the right to request access to the personal information we hold about you. We will respond to your request within thirty (30) days. We may charge a reasonable fee to cover the cost of providing access, and we will advise you of any applicable fee before proceeding;</li>
    <li><strong>Right of correction:</strong> You have the right to request that we correct any personal information that is inaccurate, out of date, incomplete, irrelevant, or misleading. You can update most of your information directly through the Platform. For other corrections, please contact us;</li>
    <li><strong>Right of deletion:</strong> You may request deletion of your account and associated personal information by contacting us at hello@bldesy.com.au or through the account settings in the Platform. Deletion will be processed in accordance with Section 5 above;</li>
    <li><strong>Right to withdraw consent:</strong> Where we rely on your consent to process personal information, you may withdraw that consent at any time. Withdrawal of consent does not affect the lawfulness of processing based on consent before its withdrawal;</li>
    <li><strong>Right to complain:</strong> If you believe we have breached the Australian Privacy Principles, you may lodge a complaint with us at hello@bldesy.com.au. We will investigate and respond to your complaint within thirty (30) days. If you are not satisfied with our response, you may lodge a complaint with the Office of the Australian Information Commissioner (OAIC) at <a href="https://www.oaic.gov.au">www.oaic.gov.au</a> or by phone at 1300 363 992;</li>
    <li><strong>Right to data portability:</strong> You may request a copy of your personal data in a structured, commonly used, machine-readable format (JSON or CSV). We will provide the export within thirty (30) days of your request. To request a data export, contact us at hello@bldesy.com.au with the subject line "Data Export Request";</li>
    <li><strong>Right to restrict processing:</strong> In certain circumstances, you may request that we restrict the processing of your personal information (for example, while we verify the accuracy of your data or investigate a complaint).</li>
  </ol>
  <p>7.2. <strong>How to delete your account:</strong> You can delete your account directly in the BLDESY! app by going to Settings &gt; Account &gt; Delete Account. Alternatively, email hello@bldesy.com.au with the subject "Account Deletion Request". Your profile will be removed from public search immediately, and all personal data will be permanently deleted within 30 days (see our Terms of Service, Section 21 for full details).</p>

  <h2>8. Children's Privacy</h2>
  <p>8.1. The Platform is not directed at children under the age of eighteen (18). We do not knowingly collect personal information from children under eighteen (18) without the consent of a parent or legal guardian.</p>
  <p>8.2. If we become aware that we have collected personal information from a child under eighteen (18) without appropriate parental or guardian consent, we will take reasonable steps to delete that information as soon as practicable.</p>
  <p>8.3. If you are a parent or guardian and believe that your child has provided personal information to us without your consent, please contact us at hello@bldesy.com.au.</p>

  <h2>9. International Data Transfers</h2>
  <p>9.1. All Platform data is hosted on Supabase infrastructure in the Sydney, Australia (ap-southeast-2) region. We do not routinely transfer your personal information outside of Australia.</p>
  <p>9.2. In limited circumstances, personal information may be processed outside Australia by third-party service providers (for example, Stripe for payment processing or Anthropic for AI services). Where such transfers occur:</p>
  <ol type="a">
    <li>We will ensure that the recipient is subject to a law or binding scheme that provides protections substantially similar to the Australian Privacy Principles; or</li>
    <li>We will take reasonable steps to ensure that the recipient handles your personal information in accordance with the Australian Privacy Principles; or</li>
    <li>You will be notified and your consent will be obtained before any such transfer.</li>
  </ol>
  <p>9.3. We will update this Privacy Policy to disclose any material changes to our international data transfer practices.</p>

  <h2>10. Changes to This Privacy Policy</h2>
  <p>10.1. We may update this Privacy Policy from time to time to reflect changes in our practices, the Platform, or applicable law.</p>
  <p>10.2. If we make material changes to this Privacy Policy, we will notify you by:</p>
  <ol type="a">
    <li>Sending a notification to the email address associated with your account; and</li>
    <li>Posting the updated Privacy Policy on the Platform with a revised "Last updated" date.</li>
  </ol>
  <p>10.3. We will provide at least fourteen (14) days' notice before material changes take effect.</p>
  <p>10.4. Your continued use of the Platform after the effective date of the updated Privacy Policy constitutes your acceptance of the changes. If you do not agree, you should stop using the Platform and contact us to delete your account.</p>

  <h2>11. Contact — Privacy Officer</h2>
  <div class="contact-box">
    <p><strong>BLDESY Pty Ltd — Privacy Officer</strong></p>
    <p>ABN 00 000 000 000</p>
    <p>Email: <a href="mailto:hello@bldesy.com.au">hello@bldesy.com.au</a></p>
    <p>Please include "Privacy" in the subject line for all privacy-related enquiries.</p>
    <p style="margin-top: 12px;">If you are not satisfied with our response to a privacy complaint, you may contact the Office of the Australian Information Commissioner (OAIC):</p>
    <p>Website: <a href="https://www.oaic.gov.au">www.oaic.gov.au</a></p>
    <p>Phone: 1300 363 992</p>
  </div>

  ${footer}
</body>
</html>`,
  sections: [
    { heading: '1. Data We Collect', body: 'Personal info (name, email, phone, location), usage data (search queries, pages visited, interactions), device info (model, OS, IP address), and location data (suburb, postcode, coordinates when you grant permission).' },
    { heading: '2. How We Collect Data', body: 'Directly from you (registration, profile, job posts), automatically from app usage (analytics, device info), via local storage (session tokens, preferences), and from third parties (Stripe for payment verification).' },
    { heading: '3. Purpose of Use', body: 'To provide and improve the service, match customers with relevant builders, send notifications and communications, ensure platform safety and prevent fraud, and comply with legal obligations.' },
    { heading: '4. Data Sharing', body: 'We never sell your data. We share with: Supabase (hosting, Sydney region), Stripe (payment processing), Anthropic (AI Assist \u2014 anonymised queries only), and law enforcement if legally required.' },
    { heading: '5. Data Retention', body: 'Active accounts: data retained while account exists. Deleted accounts: data purged within 30 days. Anonymised analytics: retained indefinitely. Backups: retained for 90 days, then destroyed.' },
    { heading: '6. Data Security', body: 'Encryption in transit (TLS 1.2+), at rest (AES-256). Hosted exclusively in Sydney ap-southeast-2 region. Role-based access controls. Regular security audits.' },
    { heading: '7. Your Rights', body: 'Under the Australian Privacy Act 1988, you can: access your data, correct inaccuracies, request deletion, request data export (JSON/CSV), withdraw consent, restrict processing, and lodge a complaint with the OAIC. Delete your account anytime via Settings > Account > Delete Account.' },
    { heading: '8. Children & International', body: 'Not intended for under 18 without guardian consent. Data is stored in Australia (Sydney). No offshore transfer unless disclosed and consented to.' },
    { heading: '9. Policy Changes', body: '14 days email notice for material changes. Continued use after the notice period constitutes acceptance.' },
    { heading: '10. Contact', body: 'Privacy Officer \u2014 BLDESY Pty Ltd\nhello@bldesy.com.au\nOAIC: www.oaic.gov.au | 1300 363 992' },
  ],
};
