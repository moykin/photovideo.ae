import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for PhotoVideo.ae — how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: May 8, 2026</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Introduction</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              PhotoVideo.ae (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the website{' '}
              <Link href="https://photovideo.ae" className="text-brand-500 hover:underline">https://photovideo.ae</Link>{' '}
              and related services. This Privacy Policy explains how we collect, use, disclose, and safeguard your information
              when you visit our platform. Please read this policy carefully. By using our service, you agree to the
              collection and use of information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. Information We Collect</h2>
            <h3 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
              <li>Name, email address, and password when you register</li>
              <li>Profile information: display name, username, bio, location, phone number</li>
              <li>Portfolio photos and videos you upload</li>
              <li>Reviews and ratings you submit</li>
              <li>Messages you send through our platform</li>
              <li>Payment information (processed securely by our payment providers)</li>
            </ul>
            <h3 className="text-base font-medium text-gray-800 dark:text-gray-200 mt-4 mb-2">2.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
              <li>IP address, browser type, operating system</li>
              <li>Pages visited, time spent on pages, referring URLs</li>
              <li>Device identifiers and cookie data</li>
            </ul>
            <h3 className="text-base font-medium text-gray-800 dark:text-gray-200 mt-4 mb-2">2.3 Information from Third Parties</h3>
            <p className="text-gray-600 dark:text-gray-400">
              If you sign in using Google, Facebook, or Apple OAuth, we receive your name, email address, and profile
              picture from that provider, subject to your privacy settings with them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
              <li>To create and manage your account</li>
              <li>To provide and improve our marketplace services</li>
              <li>To facilitate bookings between clients and photographers/videographers</li>
              <li>To send transactional emails (booking confirmations, password resets)</li>
              <li>To send marketing communications (you may opt out at any time)</li>
              <li>To analyse usage and improve our platform</li>
              <li>To comply with legal obligations</li>
              <li>To prevent fraud and ensure platform safety</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. Google API Services</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Our YT Downloader tool (/download) uses Google OAuth 2.0 to access Google Drive on your behalf.
              PhotoVideo.ae use and transfer of information received from Google APIs to any other app will adhere to{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-500 hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. We only request access to upload files to your Google Drive
              and do not store your Google credentials or access tokens beyond your session.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. Sharing Your Information</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">We do not sell your personal data. We may share it with:</p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
              <li><strong>Service providers:</strong> hosting (AWS), email (SMTP), payment processors</li>
              <li><strong>Other users:</strong> your public profile and portfolio are visible to all visitors</li>
              <li><strong>Legal authorities:</strong> when required by law or to protect rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">6. Data Retention</h2>
            <p className="text-gray-600 dark:text-gray-400">
              We retain your personal data for as long as your account is active or as needed to provide services.
              You may request deletion of your account and associated data at any time by contacting us at{' '}
              <a href="mailto:privacy@photovideo.ae" className="text-brand-500 hover:underline">privacy@photovideo.ae</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">7. Cookies</h2>
            <p className="text-gray-600 dark:text-gray-400">
              We use cookies and similar tracking technologies to maintain your session, remember preferences, and
              analyse traffic. You can control cookies through your browser settings; disabling cookies may affect
              some platform features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">8. Security</h2>
            <p className="text-gray-600 dark:text-gray-400">
              We implement industry-standard security measures including HTTPS encryption, hashed passwords, and
              access controls. No method of transmission over the Internet is 100% secure; we cannot guarantee
              absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">9. Your Rights</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt out of marketing communications</li>
              <li>Data portability</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@photovideo.ae" className="text-brand-500 hover:underline">privacy@photovideo.ae</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">10. Children&apos;s Privacy</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Our platform is not directed to children under 13. We do not knowingly collect personal information
              from children under 13. If you believe a child has provided us with personal data, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">11. Changes to This Policy</h2>
            <p className="text-gray-600 dark:text-gray-400">
              We may update this Privacy Policy periodically. We will notify you of significant changes by posting
              the new policy on this page and updating the &quot;Last updated&quot; date. Continued use of the platform after
              changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">12. Contact Us</h2>
            <p className="text-gray-600 dark:text-gray-400">
              If you have questions about this Privacy Policy, contact us at:
            </p>
            <div className="mt-2 text-gray-600 dark:text-gray-400">
              <p><strong>PhotoVideo.ae</strong></p>
              <p>Dubai, United Arab Emirates</p>
              <p>Email: <a href="mailto:privacy@photovideo.ae" className="text-brand-500 hover:underline">privacy@photovideo.ae</a></p>
              <p>Website: <Link href="https://photovideo.ae" className="text-brand-500 hover:underline">https://photovideo.ae</Link></p>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 flex gap-6 text-sm text-gray-500">
          <Link href="/terms" className="hover:text-brand-500">Terms of Service</Link>
          <Link href="/" className="hover:text-brand-500">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
