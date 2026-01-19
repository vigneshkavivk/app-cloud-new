// src/pages/faq.tsx

import React, { useState } from 'react';
import clsx from 'clsx';
import styles from './faq.module.css';
import Layout from '@theme/Layout'; // 👈 Import Layout

const FaqItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.faqItem}>
      <button
        className={clsx(styles.faqQuestion, {
          [styles.active]: isOpen,
        })}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${question.replace(/\s+/g, '-').toLowerCase()}`}
      >
        {question}
        <span className={styles.icon}>{isOpen ? '−' : '+'}</span>
      </button>
      <div
        id={`faq-answer-${question.replace(/\s+/g, '-').toLowerCase()}`}
        className={clsx(styles.faqAnswer, {
          [styles.show]: isOpen,
        })}
        role="region"
        aria-hidden={!isOpen}
      >
        {answer}
      </div>
    </div>
  );
};

export default function FAQ() {
  const faqData = [
    {
      question: "Q: Is CloudMaSa free?",
      answer: "A: Yes! The core platform is free for personal and small teams. Enterprise plans with advanced features are available."
    },
    {
      question: "Q: How secure is my data?",
      answer: "A: All data is encrypted at rest and in transit. We comply with GDPR, HIPAA, and SOC2."
    },
    {
      question: "Q: Does CloudMaSa support multi-cloud?",
      answer: "A: Yes! Connect AWS, GCP, Azure, and more — manage them from one dashboard."
    },
    {
      question: "Q: Can I integrate with my existing tools?",
      answer: "A: Absolutely! We offer API integrations and webhooks to connect with popular DevOps, monitoring, and CI/CD tools."
    }
  ];

  return (
    <Layout title="FAQ" description="Frequently asked questions about CloudMaSa">
      <div className={styles.faqContainer}>
        <h1>FAQ</h1>
        <p>Frequently asked questions about CloudMaSa.</p>
        {faqData.map((item, index) => (
          <FaqItem key={index} question={item.question} answer={item.answer} />
        ))}
      </div>
    </Layout>
  );
}