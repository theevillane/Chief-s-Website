import React from 'react';

export default function ContactPage({ setPage }) {
  return (
    <div className="page-container animate-fade" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h2>Contact the Chief&apos;s Office</h2>
        <p>
          Official contact details for the Office of the Chief, Jimo East Location.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Chief&apos;s Office</h3>
          <p style={{ fontSize: 14, color: 'var(--ink-mid)', marginBottom: 6 }}>
            <strong>Chief:</strong> John Otieno Otieno
          </p>
          <p style={{ fontSize: 14, color: 'var(--ink-mid)', marginBottom: 6 }}>
            <strong>Title:</strong> Chief, Jimo East Location
          </p>
          <p style={{ fontSize: 14, color: 'var(--ink-mid)', marginBottom: 6 }}>
            <strong>Office:</strong> Onyuongo Chief&apos;s Office, Jimo East Location
          </p>
          <p style={{ fontSize: 14, color: 'var(--ink-mid)' }}>
            <strong>Physical Address:</strong> Onyuongo Centre, Jimo East Location, Kisumu County
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Phone &amp; Email</h3>
          <p style={{ fontSize: 14, color: 'var(--ink-mid)', marginBottom: 8 }}>
            <strong>Primary Phone:</strong>{' '}
            <a href="tel:0726299887" style={{ color: 'var(--forest)', fontWeight: 600 }}>
              0726 299887
            </a>
          </p>
          <p style={{ fontSize: 14, color: 'var(--ink-mid)', marginBottom: 4 }}>
            <strong>Email:</strong>{' '}
            <a
              href={
                "mailto:jimoeast@ngao.go.ke?subject=Enquiry - Jimo East Portal&body=Dear Chief's Office,%0A%0A"
              }
              style={{ color: 'var(--forest)', fontWeight: 600 }}
            >
              jimoeast@ngao.go.ke
            </a>
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-light)', marginTop: 8 }}>
            This will open your device&apos;s email app (Gmail on most phones) with the subject pre-filled.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Office Hours</h3>
          <p style={{ fontSize: 14, color: 'var(--ink-mid)', marginBottom: 4 }}>
            <strong>Working Days:</strong> Monday – Friday
          </p>
          <p style={{ fontSize: 14, color: 'var(--ink-mid)', marginBottom: 4 }}>
            <strong>Hours:</strong> 8:00 AM – 5:00 PM (excluding public holidays)
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-light)', marginTop: 8 }}>
            For urgent security or medical emergencies, please use the dedicated national hotlines below.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Emergency Numbers</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
            {[
              { icon: '🚔', label: 'Kenya Police', num: '999' },
              { icon: '🚑', label: 'Ambulance', num: '999' },
              { icon: '👩‍⚕️', label: 'GBV Hotline', num: '1195' },
              { icon: '👶', label: 'Child Helpline', num: '116' },
            ].map((e) => (
              <div
                key={e.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--cream)',
                  border: '1px solid var(--border)',
                  fontSize: 13,
                }}
              >
                <span style={{ color: 'var(--ink-mid)' }}>
                  {e.icon} {e.label}
                </span>
                <a
                  href={`tel:${e.num}`}
                  style={{
                    color: 'var(--forest)',
                    fontWeight: 700,
                    fontFamily: "'DM Mono',monospace",
                  }}
                >
                  {e.num}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button className="btn btn-outline" onClick={() => setPage('home')}>
          ← Back
        </button>
      </div>
    </div>
  );
}

