import React from 'react';

export default function PrivacyPolicyPage({ setPage }) {
  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{title}</h3>
      <p style={{ fontSize: 13, color: 'var(--ink-mid)' }}>{children}</p>
    </div>
  );

  return (
    <div className="page-container animate-fade" style={{ maxWidth: 780 }}>
      <div className="page-header">
        <h2>Privacy Policy</h2>
        <p>How we collect, use and protect your personal data on this portal.</p>
      </div>

      <div className="card">
        <div className="card-body">
          <Section title="1. Who We Are">
            This portal is an official digital service of the Office of the Chief, Jimo East Location, under the
            National Government Administration Office (NGAO) of the Republic of Kenya.
          </Section>

          <Section title="2. What Personal Data We Collect">
            We collect your name, National ID number, phone number, village, and details of your requests, disputes or
            reports. Technical information such as device type and approximate location may be logged for security and
            auditing purposes.
          </Section>

          <Section title="3. How We Use Your Data">
            Your data is used to verify your identity, process official letters, manage disputes and security reports,
            and send necessary notifications. Aggregated, anonymised data may be used for planning and service
            improvement.
          </Section>

          <Section title="4. Anonymous Reporting">
            Some reports, especially illicit activity and sensitive security matters, can be submitted anonymously. In
            such cases we do not share your identity with third parties and take steps to protect whistleblowers in
            line with applicable Kenyan laws and policies.
          </Section>

          <Section title="5. Data Retention">
            Records submitted through this portal are retained in line with Government records management and archival
            policies. Certain data may be kept for longer periods where required by law, audit or security
            considerations.
          </Section>

          <Section title="6. Your Rights Under the Kenya Data Protection Act 2019">
            You have rights to access, correct and, where applicable, request deletion or restriction of processing of
            your personal data, subject to legal limitations. Requests can be channelled through the Chief&apos;s office
            using the contact details provided on the Contact page.
          </Section>

          <Section title="7. Security of Your Data">
            Reasonable technical and organisational measures are taken to protect your information, including secure
            transmission of data and access controls. However, no online system can be guaranteed to be 100% secure and
            you should keep your password confidential.
          </Section>

          <Section title="8. Contact for Privacy Concerns">
            For questions or concerns about how your data is handled, you may contact the Chief&apos;s office at
            jimoeast@ngao.go.ke or visit the office in person. Serious concerns can also be raised with the Office of
            the Data Protection Commissioner (ODPC).
          </Section>
        </div>
      </div>

      <div style={{ marginTop: 20, textAlign: 'left' }}>
        <button className="btn btn-outline" onClick={() => setPage('home')}>
          ← Back
        </button>
      </div>
    </div>
  );
}

