import { sharedStyles, makeHeader, footer } from './styles';

export const cookiePolicy = {
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
    { heading: '6. Managing Your Data', body: 'iOS: Settings \u2192 BLDESY! \u2192 Clear Data. Android: Settings \u2192 Apps \u2192 BLDESY! \u2192 Clear Storage. Note: clearing data will sign you out and reset preferences.' },
    { heading: '7. Effect of Disabling', body: 'If you clear local storage, you will be signed out and must log in again. Search history and preferences will be reset. Saved builders and job posts are stored server-side and will not be affected.' },
    { heading: '8. Contact', body: 'BLDESY Pty Ltd \u2014 ABN 00 000 000 000\nhello@bldesy.com.au' },
  ],
};
