import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for PhotoVideo.ae — rules and conditions for using our platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: May 8, 2026</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              By accessing or using PhotoVideo.ae (&quot;the Platform&quot;, &quot;we&quot;, &quot;us&quot;), you agree to be bound by these
              Terms of Service. If you do not agree, please do not use our platform. We reserve the right to update
              these terms at any time; continued use constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. Description of Service</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              PhotoVideo.ae is an online marketplace connecting clients with professional photographers and
              videographers in the United Arab Emirates. We provide a platform for discovery, portfolio showcasing,
              bookings, and reviews. We also provide the YT Downloader tool at /download for personal use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. User Accounts</h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
              <li>You must be at least 18 years old to create an account</li>
              <li>You are responsible for maintaining the confidentiality of your credentials</li>
              <li>You must provide accurate and complete registration information</li>
              <li>One person or entity may not maintain more than one account</li>
              <li>You are responsible for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. User Conduct</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">You agree not to:</p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
              <li>Post false, misleading, or fraudulent content</li>
              <li>Impersonate any person or entity</li>
              <li>Upload content that infringes third-party intellectual property rights</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Use the platform for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use automated tools to scrape or extract data</li>
              <li>Upload explicit, offensive, or inappropriate content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. Photographers &amp; Videographers</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Creative professionals who list services on PhotoVideo.ae agree to:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
              <li>Provide accurate descriptions of their services and pricing</li>
              <li>Only upload portfolio content they own or have rights to display</li>
              <li>Honour confirmed bookings and communicate promptly with clients</li>
              <li>Comply with UAE laws and regulations in providing services</li>
              <li>Maintain professional conduct in all client interactions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">6. Bookings and Payments</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Bookings made through the platform are agreements between the client and the photographer/videographer.
              PhotoVideo.ae acts as an intermediary and is not a party to the booking contract. Payment terms,
              cancellation policies, and dispute resolution are governed by the individual agreements between parties,
              subject to any platform-wide policies we publish separately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">7. Content and Intellectual Property</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              You retain ownership of content you upload. By uploading content, you grant PhotoVideo.ae a
              non-exclusive, worldwide, royalty-free licence to display, distribute, and promote your content on
              the platform and in marketing materials. You represent that you own or have the necessary rights to
              upload all content you post.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">8. YT Downloader Tool</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              The YT Downloader at /download is provided for personal, non-commercial use only. You agree to use
              it only for content you have the right to download, in accordance with YouTube&apos;s Terms of Service and
              applicable copyright laws. We are not responsible for any misuse of this tool.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">9. Disclaimers</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              The platform is provided &quot;as is&quot; without warranties of any kind. We do not guarantee the accuracy of
              user-generated content, the quality of services offered by photographers/videographers, or uninterrupted
              availability of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">10. Limitation of Liability</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              To the maximum extent permitted by law, PhotoVideo.ae shall not be liable for indirect, incidental,
              special, or consequential damages arising from your use of the platform, including but not limited to
              loss of profits, data, or goodwill.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">11. Termination</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              We reserve the right to suspend or terminate accounts that violate these Terms of Service, at our
              sole discretion, with or without notice. You may delete your account at any time through your dashboard
              settings or by contacting support.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">12. Governing Law</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              These Terms are governed by the laws of the United Arab Emirates. Any disputes shall be subject to
              the exclusive jurisdiction of the courts of Dubai, UAE.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">13. Contact</h2>
            <div className="text-gray-600 dark:text-gray-400">
              <p><strong>PhotoVideo.ae</strong></p>
              <p>Dubai, United Arab Emirates</p>
              <p>Email: <a href="mailto:support@photovideo.ae" className="text-brand-500 hover:underline">support@photovideo.ae</a></p>
              <p>Website: <Link href="https://photovideo.ae" className="text-brand-500 hover:underline">https://photovideo.ae</Link></p>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 flex gap-6 text-sm text-gray-500">
          <Link href="/privacy" className="hover:text-brand-500">Privacy Policy</Link>
          <Link href="/" className="hover:text-brand-500">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
