import React from 'react';

export default function TermsPage({ setPage }) {
  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{title}</h3>
      <p style={{ fontSize: 13, color: 'var(--ink-mid)' }}>{children}</p>
    </div>
  );

  return (
    <div className="page-container animate-fade" style={{ maxWidth: 780 }}>
      <div className="page-header">
        <h2>Terms of Use</h2>
        <p>These terms govern how you use the Jimo East Chief Digital Services Portal.</p>
      </div>

      <div className="card">
        <div className="card-body">
          <Section title="1. Acceptance of Terms">
            By accessing or using this portal, you agree to these Terms of Use and any updates made from time to time.
            If you do not agree, please do not use the service and instead visit the Chief&apos;s office in person.
          </Section>

          <Section title="2. Eligibility">
            This service is intended for residents of Jimo East Location who hold a valid Kenyan National ID and have a
            reachable mobile phone number. You confirm that the details you provide are true and belong to you.
          </Section>

          <Section title="3. Acceptable Use">
            You agree to use this portal only for lawful purposes, including requesting official letters, reporting
            disputes and security concerns. You must not interfere with the system, attempt unauthorised access, or use
            the service to harass, threaten or defame any person.
          </Section>

          <Section title="4. False Reports — Legal Consequences">
            Submitting false information, malicious reports or abusing this service may amount to a criminal offence
            under the Penal Code Cap. 63 and other applicable Kenyan laws. The Chief&apos;s office may take appropriate
            action, including reporting to law enforcement.
          </Section>

          <Section title="5. Official Letters">
            Letters issued through this portal are official documents of the National Government Administration Office
            (NGAO). Misuse, alteration or forgery of official letters is strictly prohibited and may lead to legal
            action. Each letter is issued for a specific stated purpose only.
          </Section>

          <Section title="6. Service Availability">
            The portal is available 24/7 for submitting requests, but processing of letters and disputes follows normal
            office working hours and capacity. In emergencies, you should always use national hotlines such as 999
            instead of relying solely on this portal.
          </Section>

          <Section title="7. Account Responsibility">
            You are responsible for keeping your login credentials confidential and for all activities carried out using
            your account. If you suspect unauthorised access, you should reset your password and inform the Chief&apos;s
            office immediately.
          </Section>

          <Section title="8. Limitation of Liability">
            While reasonable efforts are made to keep the service available and secure, the Chief&apos;s office and the
            Government are not liable for indirect losses, technical failures, or delays beyond reasonable control. This
            portal is provided &quot;as is&quot; for the convenience of residents.
          </Section>

          <Section title="9. Changes to Terms">
            These Terms of Use may be updated from time to time to reflect changes in the law or service. The latest
            version will always be available on this page and continued use of the portal means you accept the updated
            terms.
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

