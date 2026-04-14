import { sharedStyles, makeHeader, footer } from './styles';

export const disclaimer = {
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
    { heading: '9. Contact', body: 'BLDESY Pty Ltd \u2014 ABN 00 000 000 000\nhello@bldesy.com.au' },
  ],
};
