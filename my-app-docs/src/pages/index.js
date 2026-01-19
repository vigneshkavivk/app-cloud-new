// src/pages/index.js
import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

// ===== Feature Data =====
const FeatureList = [
  {
    title: '🚀 Easy to Use',
    icon: 'https://img.icons8.com/color/96/rocket.png',
    description:
      'CloudMaSa is designed for developers and DevOps engineers to set up, deploy, and manage infrastructure with zero friction.',
  },
  {
    title: '🤖 AI-Powered Masa Bot',
    icon: 'https://img.icons8.com/color/96/robot.png',
    description:
      'Get instant help, generate configs, and automate tasks with our intelligent assistant.',
  },
  {
    title: '🌐 Multi-Cloud Support',
    icon: 'https://img.icons8.com/color/96/globe.png',
    description:
      'Connect AWS, GCP, Azure, and self-managed clusters — all from one dashboard.',
  },
];

// ===== Feature Component =====
function Feature({ title, icon, description }) {
  return (
    <div
      className="col col--4"
      style={{
        padding: '1.5rem',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.9)', // ✅ Slightly more opaque white
        backdropFilter: 'blur(4px)',
        // 🔲 Darker, more visible border
        border: '1px solid rgba(0, 0, 0, 0.12)', // was 0.05 → now 0.12
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)', // ✅ subtle shadow for depth
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        cursor: 'pointer',
        textAlign: 'center',
        color: '#222',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.12)';
        e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.18)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
        e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.12)';
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <img
          src={icon.trim()}
          alt={title}
          style={{
            width: '64px',
            height: '64px',
          }}
        />
      </div>
      <h3 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '0.5rem 0' }}>
        {title}
      </h3>
      <p
        style={{
          color: '#555', // slightly darker than #666 for better contrast
          lineHeight: 1.6,
          fontSize: '0.95rem',
          marginTop: '0.5rem',
        }}
      >
        {description}
      </p>
    </div>
  );
}

// ===== Home Page =====
export default function Home() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={`${siteConfig.title} — ${siteConfig.tagline}`}
      description={siteConfig.tagline}
    >
      <div
        style={{
          position: 'relative',
          minHeight: '100vh',
          backgroundColor: '#fbfbfb',
          overflow: 'hidden',
        }}
      >
        {/* Hero */}
        <header
          style={{
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            padding: '5rem 1rem 3rem',
            color: '#111',
          }}
        >
          <h1
            style={{
              fontSize: '2.8rem',
              fontWeight: 700,
              margin: '0 0 1rem',
            }}
          >
            {siteConfig.title}
          </h1>
          <p
            style={{
              fontSize: '1.3rem',
              opacity: 0.85,
              maxWidth: '700px',
              margin: '0 auto 2rem',
              lineHeight: 1.6,
              color: '#444',
            }}
          >
            {siteConfig.tagline}
          </p>

          <Link
            to="/docs/intro"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              color: '#2c3e50',
              textDecoration: 'none',
              padding: '0.85rem 2.2rem',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '1.1rem',
              display: 'inline-block',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              letterSpacing: '0.5px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.04)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            Launch Docs →
          </Link>
        </header>

        {/* Features */}
        <main
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '4rem 1rem',
          }}
        >
          <div className="container">
            <div className="row" style={{ justifyContent: 'center' }}>
              {FeatureList.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}