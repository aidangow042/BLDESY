import { sharedStyles, makeHeader, footer } from './styles';

export const termsOfService = {
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
  <p>6.5. Builders represent and warrant that all information provided in their profile, including but not limited to trade qualifications, licence numbers, insurance details, ABN, years of experience, portfolio images, and service descriptions, is accurate, current, and not misleading. Builders must promptly update their profile to reflect any changes.</p>
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
  <p>10.4. <strong>Auto-Renewal:</strong> Subscriptions automatically renew at the end of each billing period unless cancelled. You will be charged the then-current subscription fee at the start of each renewal period.</p>
  <p>10.5. <strong>How to Cancel:</strong> You may cancel your subscription at any time through:</p>
  <ol type="a">
    <li>The BLDESY! app (Settings &gt; Billing &gt; Cancel Subscription);</li>
    <li>Apple App Store: Settings &gt; [your name] &gt; Subscriptions &gt; BLDESY! &gt; Cancel (for iOS subscribers);</li>
    <li>Google Play Store: Google Play &gt; Payments &amp; subscriptions &gt; Subscriptions &gt; BLDESY! &gt; Cancel (for Android subscribers);</li>
    <li>Contacting us at support@bldesy.com.au.</li>
  </ol>
  <p>Cancellation takes effect at the end of the current billing period. No partial refunds are provided for the remaining portion of a billing period, except as required by the Australian Consumer Law.</p>
  <p>10.6. <strong>Free Trials:</strong> If we offer a free trial, you will not be charged during the trial period. At the end of the trial, your subscription will automatically convert to a paid subscription unless you cancel before the trial expires.</p>
  <p>10.7. We reserve the right to modify our fees at any time. Any fee changes will take effect at the start of the next billing period following notice to you.</p>

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

  <h2>20. Mobile Application Terms</h2>
  <p>20.1. <strong>Apple App Store:</strong> If you download or use the BLDESY! app from the Apple App Store, you acknowledge and agree that:</p>
  <ol type="a">
    <li>These Terms are between you and BLDESY! only, and not with Apple Inc. ("Apple"). Apple is not responsible for the app or its content;</li>
    <li>Apple has no obligation to provide any maintenance or support services for the app;</li>
    <li>In the event of any failure of the app to conform to any applicable warranty, you may notify Apple and Apple will refund the purchase price (if any). To the maximum extent permitted by law, Apple has no other warranty obligation;</li>
    <li>Apple is not responsible for addressing any claims by you or any third party relating to the app;</li>
    <li>In the event of any third-party claim that the app infringes that third party's intellectual property rights, Apple is not responsible for the investigation, defence, settlement, or discharge of such claim;</li>
    <li>Apple and its subsidiaries are third-party beneficiaries of these Terms, and Apple will have the right to enforce these Terms against you as a third-party beneficiary.</li>
  </ol>
  <p>20.2. <strong>Google Play Store:</strong> If you download or use the BLDESY! app from the Google Play Store, you acknowledge that Google LLC is not responsible for the app, its content, or any claims arising from its use. Google's terms of service apply in addition to these Terms.</p>
  <p>20.3. <strong>Device permissions:</strong> The app may request access to device features including camera (for photo uploads), photo library (for selecting images), location services (for suburb-based search), and push notifications (for job alerts and messages). You can manage these permissions through your device settings at any time.</p>
  <p>20.4. <strong>Push notifications:</strong> By enabling push notifications, you consent to receive alerts about new job matches, application updates, messages, and promotional communications. You can disable push notifications at any time through your device settings.</p>

  <h2>21. Account Deletion</h2>
  <p>21.1. You may request deletion of your account at any time by:</p>
  <ol type="a">
    <li>Using the "Delete Account" option in the app (Settings &gt; Account &gt; Delete Account);</li>
    <li>Emailing us at <a href="mailto:hello@bldesy.com.au">hello@bldesy.com.au</a> with the subject line "Account Deletion Request".</li>
  </ol>
  <p>21.2. Upon receiving a deletion request, we will:</p>
  <ol type="a">
    <li>Confirm your identity;</li>
    <li>Deactivate your account within 48 hours;</li>
    <li>Permanently delete your personal data within 30 days, except where retention is required by law (e.g., financial records for 7 years under Australian tax law);</li>
    <li>Remove your public profile from search results immediately;</li>
    <li>Cancel any active subscriptions (you will not be charged after the current billing period).</li>
  </ol>
  <p>21.3. Account deletion is irreversible. You will lose access to your profile, job history, reviews, messages, and all associated data.</p>

  <h2>22. Contact Details</h2>
  <div class="contact-box">
    <p><strong>BLDESY Pty Ltd</strong></p>
    <p>ABN: Pending Registration</p>
    <p>Email: <a href="mailto:hello@bldesy.com.au">hello@bldesy.com.au</a></p>
    <p>For legal enquiries, please include "Legal" in the subject line.</p>
    <p>For account deletion requests, please include "Account Deletion Request" in the subject line.</p>
  </div>

  ${footer}
</body>
</html>`,
  sections: [
    { heading: '1. Acceptance & Eligibility', body: 'By using BLDESY! you agree to these Terms. You must be 18+ to use the platform independently, or 16\u201318 with a parent/guardian\'s consent. Creating an account means you warrant all information is truthful and accurate.' },
    { heading: '2. Service Description', body: 'BLDESY! is a connector only. We do not employ, endorse, supervise, or guarantee any builder. Any contract for work is solely between the Customer and Builder \u2014 BLDESY! is not a party to it.' },
    { heading: '3. Account & Security', body: 'You are responsible for your credentials and all activity under your account. One account per person. You must notify us immediately of any unauthorised access.' },
    { heading: '4. Builder Listing Terms', body: 'Builders pay a flat subscription. Listings are never ranked by payment \u2014 visibility is based on relevance and proximity only. BLDESY! reserves the right to suspend or remove any listing for any reason.' },
    { heading: '5. Customer Obligations', body: 'Job postings must be accurate. You may not solicit builders off-platform to avoid fees, post fake jobs, or collect builder information for marketing purposes.' },
    { heading: '6. User Content & Conduct', body: 'No defamation, spam, harassment, fake reviews, or illegal activity. You retain ownership of your content but grant BLDESY! a licence to display it on the platform.' },
    { heading: '7. Intellectual Property', body: 'BLDESY! owns all platform IP including the name, logo, design, and code. You may not copy, reverse-engineer, or create derivative works from the platform.' },
    { heading: '8. Payments & Fees', body: 'Subscriptions auto-renew and are processed via Stripe. Cancel anytime via the app, App Store, or Play Store. All fees in AUD, non-refundable unless required by Australian Consumer Law.' },
    { heading: '9. Disclaimers & Liability', body: 'The platform is provided "as is". To the maximum extent permitted by Australian Consumer Law, our liability is capped at fees paid in the last 12 months or AU$100, whichever is greater. We exclude indirect, consequential, and special damages.' },
    { heading: '10. Disputes & Governing Law', body: 'Disputes follow a 3-step process: (1) good-faith negotiation, (2) mediation via ACCC or approved mediator, (3) courts of New South Wales. Governed by the laws of NSW, Australia.' },
    { heading: '11. Modifications', body: 'We may update these Terms with 30 days written notice via email or in-app notification. Continued use after the notice period constitutes acceptance.' },
    { heading: '12. Mobile App Terms', body: 'Apple and Google are not responsible for the app. Device permissions (camera, photos, location, notifications) can be managed in your device settings. Push notifications can be disabled anytime.' },
    { heading: '13. Account Deletion', body: 'Delete your account anytime via Settings > Account > Delete Account, or email hello@bldesy.com.au. Profile removed from search immediately, data deleted within 30 days.' },
    { heading: '14. Contact', body: 'BLDESY Pty Ltd \u2014 ABN: Pending Registration\nhello@bldesy.com.au' },
  ],
};
