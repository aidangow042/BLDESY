const sharedStyles = `
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

const makeHeader = (title: string) => `
  <div class="header">
    <p class="brand">BLDESY!</p>
    <p class="doc-title">${title}</p>
    <p class="meta">Last updated: 1 March 2026</p>
    <p class="meta">BLDESY Pty Ltd &mdash; ABN 00 000 000 000</p>
  </div>
`;

const footer = `
  <div class="footer">
    &copy; 2026 BLDESY Pty Ltd. All rights reserved.
  </div>
`;

export const legalDocuments = {
  termsOfService: {
    title: 'Terms of Service',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${sharedStyles}
</head>
<body>
  ${makeHeader('Terms of Service')}

  <h2>1. Acceptance of Terms</h2>
  <p>1.1. These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you", or "your") and BLDESY Pty Ltd (ABN 00 000 000 000) ("BLDESY!", "we", "us", or "our"), governing your access to and use of the BLDESY! mobile application, website, and all related services (collectively, the "Platform").</p>
  <p>1.2. By accessing, downloading, installing, or using the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms, our Privacy Policy, our Disclaimer, and our Cookie &amp; Tracking Policy, all of which are incorporated herein by reference.</p>
  <p>1.3. If you do not agree to these Terms in their entirety, you must immediately cease using the Platform and delete any installed applications.</p>
  <p>1.4. We reserve the right to update these Terms from time to time in accordance with Section 15 below.</p>

  <h2>2. Eligibility</h2>
  <p>2.1. You must be at least eighteen (18) years of age to create an account and use the Platform independently.</p>
  <p>2.2. If you are between the ages of sixteen (16) and eighteen (18), you may use the Platform only with the express consent and supervision of a parent or legal guardian who agrees to be bound by these Terms on your behalf. The parent or legal guardian assumes full responsibility for the minor's use of the Platform.</p>
  <p>2.3. By creating an account, you represent and warrant that you meet the applicable eligibility requirements and that all registration information you provide is truthful, accurate, and complete.</p>
  <p>2.4. If you are accepting these Terms on behalf of a company, partnership, trust, or other legal entity, you represent and warrant that you have the authority to bind that entity to these Terms.</p>

  <h2>3. Description of Service</h2>
  <p>3.1. BLDESY! is a trade connection platform that connects customers seeking building, renovation, and trade services ("Customers") with licensed builders, tradespeople, and contractors ("Builders") across Australia.</p>
  <p>3.2. <strong>BLDESY! is a connector only.</strong> We do not act as an employer, contractor, subcontractor, agent, or representative of any Builder or Customer. We do not perform, supervise, direct, or control any building, renovation, or trade work.</p>
  <p>3.3. BLDESY! does not participate in, mediate, or arbitrate any negotiations, agreements, contracts, payments, or disputes between Customers and Builders, except as expressly stated in these Terms.</p>
  <p>3.4. Any contract for building, renovation, or trade work is formed solely between the Customer and the Builder. BLDESY! is not a party to any such contract and bears no responsibility or liability for its terms, performance, or breach.</p>
  <p>3.5. The Platform may include an AI-powered assistant feature ("AI Assist") that provides general guidance and suggestions. AI Assist does not constitute professional, legal, financial, or trade advice, and you should not rely on it as a substitute for independent professional consultation.</p>

  <h2>4. Account Registration and Security</h2>
  <p>4.1. To access certain features of the Platform, you must create an account by providing accurate, current, and complete information as requested during registration.</p>
  <p>4.2. You are responsible for maintaining the confidentiality of your account credentials, including your password and any authentication tokens. You must not share your account credentials with any third party.</p>
  <p>4.3. You are solely responsible for all activity that occurs under your account, whether or not authorised by you. You must immediately notify us at hello@bldesy.com.au if you become aware of any unauthorised use of your account or any other breach of security.</p>
  <p>4.4. You may not create more than one account per individual or entity. We reserve the right to merge, suspend, or terminate duplicate accounts.</p>
  <p>4.5. You may not use another person's account without their express written permission.</p>
  <p>4.6. We reserve the right to suspend or terminate your account at any time if we reasonably believe you have violated these Terms, provided false information during registration, or engaged in conduct that is harmful to other users, the Platform, or our business interests.</p>

  <h2>5. User Roles</h2>
  <h3>5.1. Customers</h3>
  <p>Customers may browse Builder profiles, search for trades by location, trade type, and urgency, save Builder profiles, post jobs, review and accept or reject Builder applications, and use the AI Assist feature. Guest browsing is permitted; however, account registration is required to post a job, contact a Builder, or save a Builder profile.</p>
  <h3>5.2. Builders</h3>
  <p>Builders may create a Builder profile, browse available jobs, submit applications for jobs, manage their profile and application history, and access the Builder Dashboard. Builder accounts require approval before activation (see Section 6).</p>

  <h2>6. Builder Listing Terms</h2>
  <p>6.1. Builders are listed on the Platform in exchange for a flat subscription fee as published on the Platform from time to time ("Subscription Fee"). The Subscription Fee is uniform for all Builders — there is no tiered pricing, pay-to-rank system, or auction mechanism.</p>
  <p>6.2. <strong>No pay-to-rank.</strong> Search results and Builder listings are not influenced by the amount a Builder pays. All Builders who pay the Subscription Fee receive equal placement opportunities. Listing order may be determined by relevance factors such as location proximity, trade match, and availability, but never by payment amount.</p>
  <p>6.3. Builder accounts are subject to manual approval by BLDESY! before activation. We reserve the right to approve or reject any Builder application at our sole discretion and without providing reasons.</p>
  <p>6.4. BLDESY! may suspend, restrict, or permanently remove any Builder listing at any time and for any reason, including but not limited to:</p>
  <ol type="a">
    <li>Violation of these Terms;</li>
    <li>Receipt of multiple complaints or negative feedback from Customers;</li>
    <li>Provision of false, misleading, or outdated information;</li>
    <li>Failure to hold current and valid licences, insurance, or registrations required by applicable law;</li>
    <li>Engagement in conduct that is harmful to other users, the Platform, or our reputation;</li>
    <li>Non-payment or late payment of the Subscription Fee.</li>
  </ol>
  <p>6.5. Builders represent and warrant that all information provided in their profile, including but not limited to trade qualifications, licence numbers, insurance details, ABN, and portfolio images, is accurate, current, and not misleading. Builders must promptly update their profile to reflect any changes.</p>
  <p>6.6. Builders acknowledge and agree that listing on the Platform does not guarantee any minimum number of enquiries, leads, job applications, or revenue.</p>
  <p>6.7. Subscription Fees are non-refundable except as required by the Australian Consumer Law.</p>

  <h2>7. Customer Obligations</h2>
  <p>7.1. Customers must ensure that all job postings are accurate, truthful, and not misleading. Job postings must include a genuine and lawful description of the work required.</p>
  <p>7.2. Customers must not post jobs that are fraudulent, unlawful, discriminatory, or that seek services that would be illegal under applicable Commonwealth, State, or Territory law.</p>
  <p>7.3. Customers must not use the Platform to solicit Builders to conduct business off-platform for the purpose of circumventing the Platform's systems, processes, or any applicable fees.</p>
  <p>7.4. Customers acknowledge that BLDESY! does not verify the qualifications, licences, insurance, or quality of work of any Builder. It is the Customer's sole responsibility to:</p>
  <ol type="a">
    <li>Verify that a Builder holds all licences and registrations required by the applicable State or Territory;</li>
    <li>Confirm that a Builder has adequate and current insurance coverage;</li>
    <li>Verify the Builder's ABN through the Australian Business Register;</li>
    <li>Conduct their own due diligence before engaging any Builder;</li>
    <li>Enter into appropriate written contracts with Builders for any work to be performed.</li>
  </ol>

  <h2>8. User Content and Conduct</h2>
  <p>8.1. "User Content" means any text, images, photographs, videos, reviews, ratings, comments, job postings, Builder profiles, portfolio items, messages, or other material that you submit, post, upload, or transmit through the Platform.</p>
  <p>8.2. You retain ownership of your User Content. By submitting User Content to the Platform, you grant BLDESY! a non-exclusive, worldwide, royalty-free, transferable, sublicensable licence to use, reproduce, modify, adapt, publish, display, distribute, and create derivative works from your User Content for the purpose of operating, improving, and promoting the Platform.</p>
  <p>8.3. You represent and warrant that you own or have all necessary rights, licences, and permissions to submit your User Content and to grant the licence described in Section 8.2.</p>
  <p>8.4. You must not submit, post, or transmit any User Content that:</p>
  <ol type="a">
    <li>Is defamatory, libellous, slanderous, or injurious to any person or entity;</li>
    <li>Is false, misleading, or deceptive;</li>
    <li>Constitutes spam, unsolicited commercial messages, or chain communications;</li>
    <li>Harasses, bullies, intimidates, or threatens any person;</li>
    <li>Is obscene, pornographic, sexually explicit, or otherwise offensive;</li>
    <li>Constitutes a fake or fraudulent review or rating;</li>
    <li>Infringes on the intellectual property rights, privacy rights, or any other rights of any third party;</li>
    <li>Contains viruses, malware, or other harmful computer code;</li>
    <li>Violates any applicable law, regulation, or ordinance;</li>
    <li>Impersonates any person or entity, or falsely states or misrepresents your affiliation with any person or entity.</li>
  </ol>
  <p>8.5. BLDESY! reserves the right, but has no obligation, to monitor, review, edit, or remove any User Content at our sole discretion, with or without notice.</p>
  <p>8.6. You must not:</p>
  <ol type="a">
    <li>Use any automated system, including bots, scrapers, or spiders, to access the Platform;</li>
    <li>Attempt to gain unauthorised access to the Platform, other user accounts, or any computer systems or networks connected to the Platform;</li>
    <li>Interfere with, disrupt, or impose an unreasonable burden on the Platform's infrastructure;</li>
    <li>Use the Platform for any purpose that is unlawful or prohibited by these Terms;</li>
    <li>Reverse-engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Platform.</li>
  </ol>

  <h2>9. Intellectual Property</h2>
  <p>9.1. The Platform, including all software, code, algorithms, designs, graphics, logos, trademarks, trade names (including "BLDESY!"), user interfaces, visual interfaces, text, images, audio, video, and all other content and materials provided by BLDESY! (collectively, "Platform IP"), is owned by or licensed to BLDESY Pty Ltd and is protected by copyright, trademark, patent, trade secret, and other intellectual property laws of Australia and international conventions.</p>
  <p>9.2. You are granted a limited, non-exclusive, non-transferable, revocable licence to access and use the Platform for your personal, non-commercial use (or for your business use as a Builder) in accordance with these Terms. This licence does not include any right to modify, reproduce, distribute, create derivative works from, publicly display, publicly perform, republish, download, store, or transmit any Platform IP, except as expressly permitted.</p>
  <p>9.3. You must not use the BLDESY! name, logo, or branding in any manner without our prior written consent.</p>
  <p>9.4. Users retain all ownership rights in their User Content, subject to the licence granted in Section 8.2.</p>

  <h2>10. Payments and Fees</h2>
  <p>10.1. Certain features of the Platform, including Builder subscriptions, may require payment. All fees are quoted in Australian Dollars (AUD) and are inclusive of GST unless otherwise stated.</p>
  <p>10.2. Payment processing is handled by our third-party payment processor, Stripe. By making a payment, you agree to Stripe's terms of service and privacy policy. BLDESY! does not store your full credit card details.</p>
  <p>10.3. Subscription Fees are charged on a recurring basis as specified at the time of purchase. You authorise us to charge your nominated payment method for all applicable fees.</p>
  <p>10.4. You may cancel your subscription at any time through the Platform. Cancellation takes effect at the end of the current billing period. No partial refunds are provided for the remaining portion of a billing period, except as required by the Australian Consumer Law.</p>
  <p>10.5. We reserve the right to modify our fees at any time. Any fee changes will take effect at the start of the next billing period following notice to you.</p>

  <h2>11. Disclaimers</h2>
  <p>11.1. To the maximum extent permitted by law, the Platform is provided on an "as is" and "as available" basis, without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.</p>
  <p>11.2. BLDESY! does not warrant that:</p>
  <ol type="a">
    <li>The Platform will be uninterrupted, timely, secure, or error-free;</li>
    <li>The information provided through the Platform is accurate, reliable, or complete;</li>
    <li>Any Builder listed on the Platform is qualified, licensed, insured, or competent;</li>
    <li>The quality of any work performed by a Builder will meet your expectations;</li>
    <li>Any errors or defects in the Platform will be corrected.</li>
  </ol>
  <p>11.3. <strong>No employment or agency relationship.</strong> Nothing in these Terms or your use of the Platform creates an employment, agency, partnership, joint venture, or franchise relationship between BLDESY! and any User, or between any Customer and any Builder through the Platform.</p>
  <p>11.4. Certain statutory guarantees and consumer protections under the Australian Consumer Law (Schedule 2 of the Competition and Consumer Act 2010 (Cth)) cannot be excluded or limited. Nothing in these Terms is intended to exclude, restrict, or modify any rights or remedies you may have under the Australian Consumer Law or any other applicable law that cannot be excluded or limited by agreement.</p>

  <h2>12. Limitation of Liability</h2>
  <p>12.1. To the maximum extent permitted by law, including the Australian Consumer Law, BLDESY!, its directors, officers, employees, agents, affiliates, and licensors shall not be liable for any:</p>
  <ol type="a">
    <li>Indirect, incidental, special, consequential, or punitive damages;</li>
    <li>Loss of profits, revenue, data, goodwill, or business opportunity;</li>
    <li>Damages arising from or related to any transaction, interaction, dispute, or relationship between a Customer and a Builder;</li>
    <li>Damages arising from your reliance on any information provided through the Platform, including AI Assist;</li>
    <li>Damages arising from unauthorised access to or alteration of your data or transmissions;</li>
    <li>Damages arising from any third-party content, products, or services accessed through the Platform.</li>
  </ol>
  <p>12.2. To the extent that our liability cannot be fully excluded, our total aggregate liability to you for all claims arising out of or in connection with these Terms or your use of the Platform shall not exceed the greater of: (a) the total fees paid by you to BLDESY! in the twelve (12) months immediately preceding the event giving rise to the claim; or (b) one hundred Australian Dollars (AU$100).</p>
  <p>12.3. The limitations in this Section 12 apply regardless of the legal theory on which the claim is based, whether in contract, tort (including negligence), strict liability, statute, or otherwise, and even if BLDESY! has been advised of the possibility of such damages.</p>
  <p>12.4. Nothing in these Terms excludes or limits liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be excluded or limited under applicable law.</p>

  <h2>13. Indemnification</h2>
  <p>13.1. You agree to indemnify, defend, and hold harmless BLDESY!, its directors, officers, employees, agents, affiliates, successors, and assigns from and against any and all claims, demands, actions, losses, liabilities, damages, costs, and expenses (including reasonable legal fees) arising out of or in connection with:</p>
  <ol type="a">
    <li>Your use of or access to the Platform;</li>
    <li>Your breach of these Terms;</li>
    <li>Your violation of any applicable law, regulation, or third-party right;</li>
    <li>Your User Content;</li>
    <li>Any dispute or interaction between you and any other User of the Platform;</li>
    <li>Any building, renovation, or trade work performed or received as a result of connections made through the Platform.</li>
  </ol>

  <h2>14. Dispute Resolution</h2>
  <p>14.1. If a dispute arises out of or in connection with these Terms or your use of the Platform ("Dispute"), the parties agree to follow this dispute resolution process:</p>
  <ol type="a">
    <li><strong>Negotiation:</strong> The parties must first attempt to resolve the Dispute by good-faith negotiation. The party raising the Dispute must provide written notice to the other party, setting out the nature of the Dispute and the relief sought. The parties shall use reasonable endeavours to resolve the Dispute within thirty (30) days of such notice.</li>
    <li><strong>Mediation:</strong> If the Dispute is not resolved through negotiation within thirty (30) days, either party may refer the Dispute to mediation administered by the Australian Disputes Centre (ADC) in Sydney, New South Wales, in accordance with the ADC Mediation Guidelines. The costs of mediation shall be shared equally between the parties.</li>
    <li><strong>Litigation:</strong> If the Dispute is not resolved through mediation within sixty (60) days of the mediation referral, either party may commence proceedings in the courts of New South Wales, Australia.</li>
  </ol>
  <p>14.2. Nothing in this Section 14 prevents either party from seeking urgent injunctive or interlocutory relief from a court of competent jurisdiction.</p>

  <h2>15. Modification of Terms</h2>
  <p>15.1. BLDESY! reserves the right to modify, amend, or replace these Terms at any time.</p>
  <p>15.2. If we make material changes to these Terms, we will provide you with at least thirty (30) days' prior notice by:</p>
  <ol type="a">
    <li>Posting the updated Terms on the Platform with a revised "Last updated" date; and</li>
    <li>Sending a notification to the email address associated with your account.</li>
  </ol>
  <p>15.3. Your continued use of the Platform after the effective date of the modified Terms constitutes your acceptance of the modified Terms. If you do not agree to the modified Terms, you must stop using the Platform and close your account before the effective date.</p>

  <h2>16. Governing Law and Jurisdiction</h2>
  <p>16.1. These Terms are governed by and construed in accordance with the laws of New South Wales, Australia, without regard to its conflict of laws principles.</p>
  <p>16.2. Subject to Section 14, the parties submit to the exclusive jurisdiction of the courts of New South Wales, Australia, and any courts competent to hear appeals therefrom.</p>

  <h2>17. Severability</h2>
  <p>17.1. If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, that provision shall be severed from these Terms and the remaining provisions shall continue in full force and effect.</p>
  <p>17.2. If a severed provision can be modified to render it valid, legal, and enforceable while preserving the parties' original intent, the court may modify the provision to the minimum extent necessary to achieve that result.</p>

  <h2>18. Entire Agreement</h2>
  <p>18.1. These Terms, together with our Privacy Policy, Disclaimer, and Cookie &amp; Tracking Policy, constitute the entire agreement between you and BLDESY! with respect to your use of the Platform.</p>
  <p>18.2. These Terms supersede all prior or contemporaneous communications, representations, understandings, and agreements, whether oral or written, between you and BLDESY! relating to the subject matter of these Terms.</p>
  <p>18.3. No waiver of any provision of these Terms shall be deemed a further or continuing waiver of such provision or any other provision, and our failure to assert any right or provision under these Terms shall not constitute a waiver of such right or provision.</p>

  <h2>19. Assignment</h2>
  <p>19.1. You may not assign, transfer, or sublicense any of your rights or obligations under these Terms without our prior written consent.</p>
  <p>19.2. BLDESY! may assign, transfer, or sublicense its rights and obligations under these Terms without restriction and without notice to you, including in connection with a merger, acquisition, reorganisation, or sale of assets.</p>

  <h2>20. Contact Details</h2>
  <div class="contact-box">
    <p><strong>BLDESY Pty Ltd</strong></p>
    <p>ABN 00 000 000 000</p>
    <p>Email: <a href="mailto:hello@bldesy.com.au">hello@bldesy.com.au</a></p>
    <p>For legal enquiries, please include "Legal" in the subject line.</p>
  </div>

  ${footer}
</body>
</html>`,
    sections: [
      { heading: '1. Acceptance & Eligibility', body: 'By using BLDESY! you agree to these Terms. You must be 18+ to use the platform independently, or 16–18 with a parent/guardian\'s consent. Creating an account means you warrant all information is truthful and accurate.' },
      { heading: '2. Service Description', body: 'BLDESY! is a connector only. We do not employ, endorse, supervise, or guarantee any builder. Any contract for work is solely between the Customer and Builder — BLDESY! is not a party to it.' },
      { heading: '3. Account & Security', body: 'You are responsible for your credentials and all activity under your account. One account per person. You must notify us immediately of any unauthorised access.' },
      { heading: '4. Builder Listing Terms', body: 'Builders pay a flat subscription. Listings are never ranked by payment — visibility is based on relevance and proximity only. BLDESY! reserves the right to suspend or remove any listing for any reason.' },
      { heading: '5. Customer Obligations', body: 'Job postings must be accurate. You may not solicit builders off-platform to avoid fees, post fake jobs, or collect builder information for marketing purposes.' },
      { heading: '6. User Content & Conduct', body: 'No defamation, spam, harassment, fake reviews, or illegal activity. You retain ownership of your content but grant BLDESY! a licence to display it on the platform.' },
      { heading: '7. Intellectual Property', body: 'BLDESY! owns all platform IP including the name, logo, design, and code. You may not copy, reverse-engineer, or create derivative works from the platform.' },
      { heading: '8. Payments & Fees', body: 'Builder subscriptions are processed via Stripe. All fees are in AUD and non-refundable unless required by Australian Consumer Law. We may change pricing with 30 days notice.' },
      { heading: '9. Disclaimers & Liability', body: 'The platform is provided "as is". To the maximum extent permitted by Australian Consumer Law, our liability is capped at fees paid in the last 12 months or AU$100, whichever is greater. We exclude indirect, consequential, and special damages.' },
      { heading: '10. Disputes & Governing Law', body: 'Disputes follow a 3-step process: (1) good-faith negotiation, (2) mediation via ACCC or approved mediator, (3) courts of New South Wales. Governed by the laws of NSW, Australia.' },
      { heading: '11. Modifications', body: 'We may update these Terms with 30 days written notice via email or in-app notification. Continued use after the notice period constitutes acceptance.' },
      { heading: '12. Contact', body: 'BLDESY Pty Ltd — ABN 00 000 000 000\nhello@bldesy.com.au' },
    ],
  },

  privacyPolicy: {
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
    <li><strong>Right to complain:</strong> If you believe we have breached the Australian Privacy Principles, you may lodge a complaint with us at hello@bldesy.com.au. We will investigate and respond to your complaint within thirty (30) days. If you are not satisfied with our response, you may lodge a complaint with the Office of the Australian Information Commissioner (OAIC) at <a href="https://www.oaic.gov.au">www.oaic.gov.au</a> or by phone at 1300 363 992.</li>
  </ol>

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
      { heading: '4. Data Sharing', body: 'We never sell your data. We share with: Supabase (hosting, Sydney region), Stripe (payment processing), Anthropic (AI Assist — anonymised queries only), and law enforcement if legally required.' },
      { heading: '5. Data Retention', body: 'Active accounts: data retained while account exists. Deleted accounts: data purged within 30 days. Anonymised analytics: retained indefinitely. Backups: retained for 90 days, then destroyed.' },
      { heading: '6. Data Security', body: 'Encryption in transit (TLS 1.2+), at rest (AES-256). Hosted exclusively in Sydney ap-southeast-2 region. Role-based access controls. Regular security audits.' },
      { heading: '7. Your Rights', body: 'Under the Australian Privacy Act 1988, you can: access your data, correct inaccuracies, request deletion, withdraw consent, and lodge a complaint with the Office of the Australian Information Commissioner (OAIC).' },
      { heading: '8. Children & International', body: 'Not intended for under 18 without guardian consent. Data is stored in Australia (Sydney). No offshore transfer unless disclosed and consented to.' },
      { heading: '9. Policy Changes', body: '14 days email notice for material changes. Continued use after the notice period constitutes acceptance.' },
      { heading: '10. Contact', body: 'Privacy Officer — BLDESY Pty Ltd\nhello@bldesy.com.au\nOAIC: www.oaic.gov.au | 1300 363 992' },
    ],
  },

  disclaimer: {
    title: 'Disclaimer',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${sharedStyles}
</head>
<body>
  ${makeHeader('Disclaimer')}

  <p>This Disclaimer forms part of the Terms of Service for the BLDESY! platform operated by BLDESY Pty Ltd (ABN 00 000 000 000) ("BLDESY!", "we", "us", or "our"). Please read this Disclaimer carefully before using the BLDESY! mobile application, website, and related services (collectively, the "Platform"). By using the Platform, you acknowledge that you have read and understood this Disclaimer.</p>

  <h2>1. No Endorsement of Builders</h2>
  <p>1.1. BLDESY! does not endorse, recommend, certify, guarantee, or vouch for any Builder, tradesperson, contractor, or service provider listed on the Platform.</p>
  <p>1.2. The inclusion of a Builder on the Platform does not constitute any representation, warranty, or endorsement by BLDESY! regarding that Builder's qualifications, competence, reliability, honesty, quality of work, financial standing, or fitness for any particular purpose.</p>
  <p>1.3. Builder profiles and listings are created and maintained by the Builders themselves. BLDESY! does not independently verify the accuracy, completeness, or truthfulness of any information in Builder profiles, including but not limited to trade qualifications, licence numbers, insurance details, ABN, years of experience, portfolio images, or service descriptions.</p>
  <p>1.4. The display of ratings and reviews on the Platform reflects the opinions of individual users and does not represent the views or endorsement of BLDESY!.</p>

  <h2>2. No Warranty on Builder Quality, Availability, or Pricing</h2>
  <p>2.1. BLDESY! makes no warranty, representation, or guarantee of any kind regarding:</p>
  <ol type="a">
    <li>The quality, safety, legality, timeliness, or competence of any work performed by any Builder;</li>
    <li>The availability of any Builder for any particular job, timeframe, or location;</li>
    <li>The pricing, quotations, or estimates provided by any Builder;</li>
    <li>The suitability of any Builder for any particular project or task;</li>
    <li>The accuracy or reliability of any information provided by any Builder, including response times, service areas, and specialisations;</li>
    <li>The outcome or satisfaction of any engagement between a Customer and a Builder.</li>
  </ol>
  <p>2.2. All transactions, agreements, and interactions between Customers and Builders are conducted at the parties' own risk. BLDESY! is not responsible for any loss, damage, cost, or liability arising from such transactions, agreements, or interactions.</p>

  <h2>3. User Responsibility to Verify</h2>
  <p>3.1. It is your sole responsibility to conduct your own due diligence before engaging any Builder or tradesperson found through the Platform. This includes, but is not limited to:</p>
  <ol type="a">
    <li><strong>Licences and registrations:</strong> Verifying that the Builder holds all licences, registrations, and certifications required by the relevant State or Territory authority for the type of work to be performed (e.g., NSW Fair Trading contractor licence, Victorian Building Authority registration, QBCC licence);</li>
    <li><strong>Insurance:</strong> Confirming that the Builder holds current and adequate public liability insurance, professional indemnity insurance (where applicable), and workers' compensation insurance (where applicable);</li>
    <li><strong>ABN verification:</strong> Verifying the Builder's Australian Business Number (ABN) through the Australian Business Register (<a href="https://abr.business.gov.au">abr.business.gov.au</a>) to confirm their business is active and registered;</li>
    <li><strong>References and past work:</strong> Requesting and checking references, reviewing past work examples, and conducting any other checks you consider necessary;</li>
    <li><strong>Written contracts:</strong> Entering into a comprehensive written contract with the Builder before any work commences, setting out the scope of work, timeline, payment terms, warranty provisions, and dispute resolution procedures;</li>
    <li><strong>Compliance:</strong> Ensuring that any work to be performed complies with all applicable building codes, planning regulations, and work health and safety requirements.</li>
  </ol>
  <p>3.2. BLDESY! strongly recommends that you obtain multiple quotes before engaging any Builder and that you do not rely solely on information provided through the Platform when making your decision.</p>

  <h2>4. Limitation of Liability</h2>
  <p>4.1. To the maximum extent permitted by law, including the Australian Consumer Law (Schedule 2 of the <em>Competition and Consumer Act 2010</em> (Cth)), BLDESY!, its directors, officers, employees, agents, affiliates, and licensors exclude all liability for any:</p>
  <ol type="a">
    <li><strong>Indirect damages:</strong> Including but not limited to loss of profits, loss of revenue, loss of business, loss of anticipated savings, loss of goodwill, loss of data, and loss of opportunity;</li>
    <li><strong>Consequential damages:</strong> Including but not limited to damages arising as a consequence of a breach but not directly caused by the breach;</li>
    <li><strong>Special damages:</strong> Including but not limited to damages that arise from special circumstances that were not reasonably foreseeable at the time of entering into these Terms;</li>
    <li><strong>Exemplary or punitive damages:</strong> Except where awarded by a court of competent jurisdiction in circumstances where such damages cannot be excluded by law.</li>
  </ol>
  <p>4.2. These exclusions apply regardless of the cause of action and whether the claim is based in contract, tort (including negligence), statute, equity, or otherwise.</p>
  <p>4.3. Nothing in this Disclaimer is intended to exclude, restrict, or modify any consumer guarantees, rights, or remedies conferred under the Australian Consumer Law or any other applicable legislation where such exclusion, restriction, or modification would be void or unenforceable.</p>

  <h2>5. Cap on Liability</h2>
  <p>5.1. To the extent that the liability of BLDESY! cannot be fully excluded under applicable law, our total aggregate liability to you, arising out of or in connection with your use of the Platform, these Terms, or any related agreement, whether in contract, tort (including negligence), statute, or otherwise, shall not exceed the greater of:</p>
  <ol type="a">
    <li>The total amount of fees paid by you to BLDESY! in the twelve (12) months immediately preceding the event that gave rise to the claim; or</li>
    <li>One hundred Australian Dollars (AU$100).</li>
  </ol>
  <p>5.2. This cap applies to the aggregate of all claims and is not a per-claim limit.</p>

  <h2>6. Force Majeure</h2>
  <p>6.1. BLDESY! shall not be liable for any failure or delay in performing its obligations under these Terms where such failure or delay results from circumstances beyond our reasonable control ("Force Majeure Event"), including but not limited to:</p>
  <ol type="a">
    <li>Natural disasters (flood, earthquake, bushfire, storm, pandemic, epidemic);</li>
    <li>Acts of war, terrorism, civil unrest, or insurrection;</li>
    <li>Government actions, sanctions, embargoes, or regulatory changes;</li>
    <li>Power outages, telecommunications failures, or internet service disruptions;</li>
    <li>Failure of third-party service providers (including but not limited to Supabase, Stripe, and cloud hosting providers);</li>
    <li>Labour disputes, strikes, or industrial action;</li>
    <li>Cyberattacks, including denial-of-service attacks, ransomware, or hacking.</li>
  </ol>
  <p>6.2. If a Force Majeure Event continues for more than ninety (90) consecutive days, either party may terminate the affected services by providing written notice to the other party.</p>

  <h2>7. Third-Party Links and Content</h2>
  <p>7.1. The Platform may contain links to third-party websites, applications, or services that are not owned or controlled by BLDESY!. We are not responsible for the content, privacy policies, practices, availability, or security of any third-party sites or services.</p>
  <p>7.2. The inclusion of any link on the Platform does not imply endorsement, approval, or recommendation by BLDESY! of the linked site or its content.</p>
  <p>7.3. You access third-party links at your own risk and should review the terms and privacy policies of any third-party site before providing personal information or engaging with its services.</p>

  <h2>8. Professional Advice Disclaimer</h2>
  <p>8.1. The information provided on the Platform, including content generated by the AI Assist feature, is for general informational purposes only and does not constitute professional advice of any kind.</p>
  <p>8.2. The Platform does not provide and should not be relied upon for:</p>
  <ol type="a">
    <li>Legal advice (including advice on building contracts, consumer rights, or dispute resolution);</li>
    <li>Financial advice (including advice on budgeting, financing, or insurance);</li>
    <li>Building or construction advice (including advice on building methods, materials, structural integrity, or compliance with building codes);</li>
    <li>Work health and safety advice;</li>
    <li>Tax advice (including advice on GST, income tax, or contractor obligations).</li>
  </ol>
  <p>8.3. You should always seek independent professional advice from appropriately qualified professionals before making decisions related to building, renovation, or trade work.</p>
  <p>8.4. AI Assist responses are generated by artificial intelligence and may contain errors, inaccuracies, or outdated information. You should not rely on AI Assist responses as a substitute for professional consultation.</p>

  <h2>9. Contact</h2>
  <div class="contact-box">
    <p><strong>BLDESY Pty Ltd</strong></p>
    <p>ABN 00 000 000 000</p>
    <p>Email: <a href="mailto:hello@bldesy.com.au">hello@bldesy.com.au</a></p>
  </div>

  ${footer}
</body>
</html>`,
    sections: [
      { heading: '1. No Endorsement', body: 'Listing a builder on BLDESY! does not constitute an endorsement, recommendation, or guarantee. We do not vet the quality of work performed by any builder.' },
      { heading: '2. No Warranty', body: 'The platform is provided "as is" and "as available". We make no warranties regarding builder availability, pricing accuracy, response times, qualifications, or the quality of any work performed.' },
      { heading: '3. Verify Independently', body: 'Customers must independently verify builder licences, insurance, ABN, qualifications, and references before engaging. Check the relevant state/territory licensing authority and ensure adequate insurance is in place.' },
      { heading: '4. Limitation of Liability', body: 'To the maximum extent permitted by Australian law (preserving rights under the Competition and Consumer Act 2010), BLDESY! excludes liability for indirect, incidental, consequential, punitive, or special damages.' },
      { heading: '5. Liability Cap', body: 'Our total aggregate liability is capped at the greater of: (a) total fees you paid to BLDESY! in the 12 months before the claim, or (b) AU$100.' },
      { heading: '6. Force Majeure', body: 'We are not liable for failures caused by events beyond reasonable control including natural disasters, pandemics, government actions, infrastructure failures, or cyberattacks.' },
      { heading: '7. Third-Party Links', body: 'The platform may contain links to third-party websites. We have no control over and accept no responsibility for their content, practices, or policies.' },
      { heading: '8. AI Assist Disclaimer', body: 'The AI Assist feature provides general guidance only and is not professional advice. Always consult a licensed professional for specific building, legal, or financial decisions.' },
      { heading: '9. Contact', body: 'BLDESY Pty Ltd — ABN 00 000 000 000\nhello@bldesy.com.au' },
    ],
  },

  cookiePolicy: {
    title: 'Cookie & Tracking Policy',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${sharedStyles}
</head>
<body>
  ${makeHeader('Cookie & Tracking Policy')}

  <p>This Cookie &amp; Tracking Policy explains how BLDESY Pty Ltd (ABN 00 000 000 000) ("BLDESY!", "we", "us", or "our") uses cookies, local storage, and similar tracking technologies when you use the BLDESY! mobile application, website, and related services (collectively, the "Platform"). This policy should be read in conjunction with our Privacy Policy.</p>

  <h2>1. What Are Cookies and Local Storage?</h2>
  <p>1.1. <strong>Cookies</strong> are small text files placed on your device by a website or application. They are widely used to make websites and applications work efficiently and to provide information to the operators of the site or application.</p>
  <p>1.2. <strong>Local storage</strong> (including AsyncStorage in mobile applications) is a mechanism that allows applications to store data locally on your device. It functions similarly to cookies but can store larger amounts of data and is commonly used in mobile applications.</p>
  <p>1.3. <strong>Session tokens</strong> are temporary identifiers used to maintain your authenticated session while you use the Platform. They allow you to navigate between screens and features without having to re-enter your credentials.</p>

  <h2>2. What We Use and Why</h2>
  <p>We use the following cookies, local storage, and similar technologies on the Platform:</p>

  <h3>2.1. Essential / Strictly Necessary</h3>
  <p>These are required for the Platform to function and cannot be disabled:</p>
  <ol type="a">
    <li><strong>Authentication tokens:</strong> We store a secure authentication token (via Supabase Auth) in your device's local storage to keep you signed in between sessions. Without this, you would need to sign in every time you open the app;</li>
    <li><strong>Session identifiers:</strong> Temporary session tokens that maintain your authenticated state during a single session;</li>
    <li><strong>Security tokens:</strong> Tokens used to prevent cross-site request forgery (CSRF) and other security threats;</li>
    <li><strong>Refresh tokens:</strong> Securely stored tokens that allow your session to be renewed without requiring you to re-enter your credentials.</li>
  </ol>

  <h3>2.2. Functional / Preference</h3>
  <p>These enhance your experience by remembering your choices:</p>
  <ol type="a">
    <li><strong>Theme preference:</strong> Your light/dark mode preference (if manually set rather than following system preference);</li>
    <li><strong>Search history:</strong> Your recent search queries (trade types, locations) stored locally on your device to provide quick access to previous searches;</li>
    <li><strong>Onboarding state:</strong> A flag indicating whether you have completed the onboarding flow, so it is not shown again;</li>
    <li><strong>Map preferences:</strong> Your last viewed map region and zoom level for a faster map loading experience.</li>
  </ol>

  <h3>2.3. Analytics</h3>
  <p>We collect anonymised usage data to understand how the Platform is used and to improve our services:</p>
  <ol type="a">
    <li><strong>Screen views:</strong> Which screens and features are most frequently accessed;</li>
    <li><strong>Feature engagement:</strong> How users interact with specific features (e.g., search, map, AI Assist);</li>
    <li><strong>Performance metrics:</strong> App loading times, error rates, and crash reports;</li>
    <li><strong>Session analytics:</strong> Session duration, frequency of use, and retention metrics.</li>
  </ol>
  <p>All analytics data is collected in anonymised or aggregated form. We do not use analytics cookies or technologies to build individual user profiles for advertising purposes.</p>

  <h2>3. No Third-Party Advertising Cookies</h2>
  <p>3.1. <strong>BLDESY! does not use third-party advertising cookies or tracking technologies.</strong> We do not serve advertisements on the Platform, and we do not allow third-party advertisers to place cookies or tracking technologies on the Platform.</p>
  <p>3.2. We do not participate in any advertising networks, real-time bidding platforms, or cross-site tracking programs.</p>
  <p>3.3. We do not share your personal information with third parties for the purpose of targeted advertising.</p>
  <p>3.4. If we introduce any form of advertising in the future, we will update this Cookie &amp; Tracking Policy and provide you with notice in accordance with our Privacy Policy.</p>

  <h2>4. How to Manage Cookies and Local Storage</h2>
  <p>You can control and manage cookies and local storage through the following methods:</p>

  <h3>4.1. Mobile App (iOS and Android)</h3>
  <ol type="a">
    <li><strong>Clear app data:</strong> You can clear the app's stored data through your device's settings (Settings &gt; Apps &gt; BLDESY! &gt; Storage &gt; Clear Data on Android, or by deleting and reinstalling the app on iOS);</li>
    <li><strong>Sign out:</strong> Signing out of the Platform clears your authentication tokens from local storage;</li>
    <li><strong>Location permissions:</strong> You can enable or disable location services for the BLDESY! app through your device's settings (Settings &gt; Privacy &gt; Location Services on iOS, or Settings &gt; Location on Android).</li>
  </ol>

  <h3>4.2. Web Browser</h3>
  <ol type="a">
    <li><strong>Browser settings:</strong> Most web browsers allow you to control cookies through their settings. You can typically find these settings in the "Privacy" or "Security" section of your browser's preferences;</li>
    <li><strong>Clear browsing data:</strong> You can clear cookies, local storage, and other site data through your browser's settings;</li>
    <li><strong>Incognito/private mode:</strong> Using your browser's private or incognito mode will prevent cookies from being stored after you close the browser window.</li>
  </ol>

  <h3>4.3. Device-Level Controls</h3>
  <ol type="a">
    <li><strong>Advertising identifier:</strong> You can reset or limit your device's advertising identifier through your device settings (Settings &gt; Privacy &gt; Advertising on iOS, or Settings &gt; Google &gt; Ads on Android);</li>
    <li><strong>Do Not Track:</strong> Some browsers offer a "Do Not Track" signal. While there is no universal standard for responding to these signals, we respect your privacy preferences to the extent practicable.</li>
  </ol>

  <h2>5. Effect of Disabling Cookies and Local Storage</h2>
  <p>5.1. If you clear or disable essential cookies and local storage, the following effects may occur:</p>
  <ol type="a">
    <li><strong>Automatic sign-out:</strong> You will be signed out of the Platform and will need to re-enter your credentials to access your account;</li>
    <li><strong>Loss of preferences:</strong> Your saved preferences (theme, search history, onboarding state, map settings) will be reset to defaults;</li>
    <li><strong>Reduced functionality:</strong> Certain features of the Platform may not function correctly or may be unavailable;</li>
    <li><strong>Repeated prompts:</strong> You may see onboarding screens, permission prompts, or informational notices that you have previously dismissed.</li>
  </ol>
  <p>5.2. Disabling analytics tracking will not affect your ability to use the Platform. All core features will continue to function normally.</p>
  <p>5.3. We will never deny you access to the core features of the Platform solely because you have disabled non-essential cookies or tracking technologies.</p>

  <h2>6. Data Collected via Tracking Technologies</h2>
  <p>6.1. Any personal information collected through cookies or local storage is handled in accordance with our Privacy Policy.</p>
  <p>6.2. We retain cookie and local storage data only for as long as necessary to fulfil the purposes described in this policy. Authentication tokens are refreshed periodically and invalidated upon sign-out. Analytics data is anonymised and aggregated.</p>

  <h2>7. Changes to This Policy</h2>
  <p>7.1. We may update this Cookie &amp; Tracking Policy from time to time to reflect changes in our practices or applicable law.</p>
  <p>7.2. Material changes will be communicated in accordance with the notice provisions in our Privacy Policy.</p>
  <p>7.3. Your continued use of the Platform after changes to this policy constitutes acceptance of the updated policy.</p>

  <h2>8. Contact</h2>
  <div class="contact-box">
    <p><strong>BLDESY Pty Ltd</strong></p>
    <p>ABN 00 000 000 000</p>
    <p>Email: <a href="mailto:hello@bldesy.com.au">hello@bldesy.com.au</a></p>
    <p>For questions about cookies and tracking, please include "Cookies" in the subject line.</p>
  </div>

  ${footer}
</body>
</html>`,
    sections: [
      { heading: '1. What Are Cookies?', body: 'Cookies are small data files stored on your device. In a mobile app context, we use local storage and session tokens rather than traditional web cookies. These serve the same purpose: keeping you signed in and remembering preferences.' },
      { heading: '2. Essential Storage', body: 'Authentication tokens (keep you signed in), session identifiers (secure your session), and app preferences (theme, language, recent searches). These are required for the app to function.' },
      { heading: '3. Functional Storage', body: 'Last search parameters, recently viewed builder profiles, notification preferences, and onboarding completion status. These enhance your experience but can be cleared.' },
      { heading: '4. Analytics', body: 'We collect anonymised usage data (screen views, feature usage, error reports) to improve the app. No personally identifiable information is shared with analytics providers.' },
      { heading: '5. No Advertising Cookies', body: 'BLDESY! does not use third-party advertising cookies, tracking pixels, or retargeting technologies. We do not build advertising profiles or sell data to advertisers.' },
      { heading: '6. Managing Your Data', body: 'iOS: Settings → BLDESY! → Clear Data. Android: Settings → Apps → BLDESY! → Clear Storage. Note: clearing data will sign you out and reset preferences.' },
      { heading: '7. Effect of Disabling', body: 'If you clear local storage, you will be signed out and must log in again. Search history and preferences will be reset. Saved builders and job posts are stored server-side and will not be affected.' },
      { heading: '8. Contact', body: 'BLDESY Pty Ltd — ABN 00 000 000 000\nhello@bldesy.com.au' },
    ],
  },
};
