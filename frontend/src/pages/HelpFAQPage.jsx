import React, { useState } from 'react';

const SECTIONS = [
  {
    key: 'getting_started',
    title: 'Getting Started / Registration',
    body:
      'To use this portal you need a valid Kenyan phone number and National ID. Create an account using your full name, ID number, village and phone. An OTP will be sent to your phone to verify that you own the number before you can submit any requests.',
  },
  {
    key: 'letters',
    title: 'Requesting an Official Letter',
    body:
      'You can request five types of official letters: Identification Letter (confirm identity), Residence Confirmation (proof of residence), School Admission Letter (support admission), Good Conduct / Character (confirm conduct), and Introduction Letter (ID) (first-time National ID). Choose the correct type, select your village, and clearly state the purpose of the letter. After submitting, the Chief reviews your request and you will receive an SMS when the signed PDF is ready for download.',
  },
  {
    key: 'disputes',
    title: 'Reporting a Dispute',
    body:
      'Use the dispute form for land, family or neighbour conflicts that require mediation at the Chief’s office. Provide details of the parties involved, a clear description of the issue, and your village. The Chief will schedule a hearing where all parties are invited. Most disputes are heard within 7–14 working days depending on urgency and complexity.',
  },
  {
    key: 'security',
    title: 'Security & Emergency Reports',
    body:
      'If there is immediate danger to life or property, always call 999 first. Use this portal to report non-emergency security concerns such as suspicious activity, repeat theft, or brewing of illicit alcohol. The Chief can coordinate with local administration and police based on your report.',
  },
  {
    key: 'illicit',
    title: 'Illicit Activity Reports',
    body:
      'Illicit activity reports, including chang’aa brewing, drug use, or illegal gambling, can be submitted anonymously. Your identity is not shared with accused persons. Provide as much detail as you can about the location, times and people involved so that action can be taken.',
  },
  {
    key: 'tracking',
    title: 'Tracking Your Requests',
    body:
      'All letters and disputes receive a reference number (Ref No.). You can track status from your dashboard. Common statuses include: Submitted, Under Review, Hearing Scheduled, Resolved and Closed. You will also receive SMS notifications when there are important updates.',
  },
  {
    key: 'announcements',
    title: 'Announcements & Barazas',
    body:
      'The Announcements section shows official notices from the Chief’s office such as baraza dates, public meetings, vaccination drives and security alerts. Some announcements may also be sent by SMS if you opted in for notifications.',
  },
  {
    key: 'technical',
    title: 'Technical Troubleshooting',
    body:
      'If you do not receive an OTP: confirm your phone has network, is not in flight mode and that you entered the correct number starting with 07. Use the Resend OTP option and wait a few minutes before trying again. For password reset issues, ensure you use the same phone used during registration. If downloads fail, try again on a stable connection or a different browser. You can always visit the Chief’s office for assisted digital support.',
  },
];

export default function HelpFAQPage({ setPage }) {
  const [openKey, setOpenKey] = useState(SECTIONS[0]?.key);

  const toggle = (key) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  return (
    <div className="page-container animate-fade" style={{ maxWidth: 780 }}>
      <div className="page-header">
        <h2>Help &amp; Frequently Asked Questions</h2>
        <p>Guidance on how to use the Jimo East Chief Digital Services Portal.</p>
      </div>

      <div className="card">
        <div className="card-body">
          {SECTIONS.map((item) => {
            const isOpen = openKey === item.key;
            return (
              <div
                key={item.key}
                style={{
                  borderBottom: '1px solid var(--border)',
                  padding: '10px 0',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(item.key)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    padding: '8px 4px',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--ink-mid)',
                      textAlign: 'left',
                    }}
                  >
                    {item.title}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--ink-faint)' }}>
                    {isOpen ? '▲' : '▼'}
                  </span>
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: '4px 4px 10px',
                      fontSize: 13,
                      color: 'var(--ink-light)',
                    }}
                  >
                    {item.body}
                  </div>
                )}
              </div>
            );
          })}
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

