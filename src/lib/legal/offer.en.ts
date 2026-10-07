import type { LegalDoc } from ".";

export const offerEn: LegalDoc = {
  title: "Public Offer for the Ustoz AI Service",
  lead:
    "This document is an offer by Askar SaaS Corporation LLC (a fictitious entity, the “Provider”) to enter into a contract for paid services on the terms below " +
    "with any legally capable individual (the “User”) within the meaning of Article 369 of the Civil Code of the Republic of Uzbekistan.",
  sections: [
    {
      id: "terms",
      title: "Definitions",
      items: [
        "Service — the Ustoz AI web application for learning English with an AI tutor, available on the Provider’s website and as a Telegram Mini App.",
        "Account — the User’s account in the Service, created with an email address.",
        "Plan — a set of features and limits of the Service (Free, Plus, Pro) with the price and term shown on the “Plans” page.",
        "Subscription — paid access to a paid Plan for the chosen period (1, 3, 6 or 12 months).",
        "Acceptance — full and unconditional acceptance of this offer as set out in section 3.",
      ],
    },
    {
      id: "subject",
      title: "Subject of the contract",
      items: [
        "The Provider gives the User access to the features of the Service within the chosen Plan, and the User pays for a paid Plan. The contract is governed by Chapter 38 “Paid services” of the Civil Code of the Republic of Uzbekistan (Articles 703–708).",
        "The Free plan is provided at no charge with limited daily allowances. The features and limits of each Plan are shown on the “Plans” page and form part of this offer.",
        "The AI tutor’s answers are generated automatically for learning purposes; the Provider does not guarantee that they are free of errors.",
      ],
    },
    {
      id: "acceptance",
      title: "Acceptance and conclusion of the contract",
      items: [
        "Under Article 370 of the Civil Code of the Republic of Uzbekistan, this offer is accepted by registering an Account or by paying for a Plan, whichever happens first.",
        "The contract is concluded electronically at the moment of acceptance (Articles 16 and 19 of Law of the Republic of Uzbekistan No. ZRU-792 “On Electronic Commerce” of 29.09.2022). The date of acceptance and the edition of the offer are stored in the Account.",
        "Using the Service as a guest without registering is allowed for evaluation; these terms apply to it except for the parts related to payment.",
      ],
    },
    {
      id: "price",
      title: "Prices and payment",
      items: [
        "Plan prices are stated in Uzbek soʻm on the “Plans” page. Paying for several months gives the discount shown there. The final amount is shown before the “Pay” button is pressed.",
        "Payment is made by bank card (Uzcard, HUMO, Visa, Mastercard) through payment organisations and payment systems. The Provider neither receives nor stores full card details: for repeat payments only a token issued by the payment organisation is kept.",
        "The payment organisation’s duty to disclose its fee in advance and to issue a document confirming the payment is set by Article 17 of Law of the Republic of Uzbekistan No. ZRU-578 “On Payments and Payment Systems” of 01.11.2019. An electronic receipt is issued to the User after payment.",
        "A Subscription takes effect once payment is received. Each renewal period starts from the end date of the current period, so renewing early does not shorten the time already paid for.",
      ],
    },
    {
      id: "trial",
      title: "Free trial",
      items: [
        "A User who has never had a paid Plan may be offered a free trial. Its length is shown on the “Plans” page.",
        "The trial is given once per Account and does not turn into a paid Subscription without a separate payment.",
      ],
    },
    {
      id: "renewal",
      title: "Auto-renewal and plan changes",
      items: [
        "If a card was saved at payment and auto-renewal is on, the Provider charges the next period shortly before the current one ends. The User is notified of the upcoming charge in advance.",
        "Auto-renewal can be turned off at any time in “Subscription”. Access to the paid Plan then lasts until the end of the paid period, after which the Account moves to the Free plan.",
        "If a charge fails, the Subscription becomes past due and further attempts are made during a grace period. If payment is still not received, the Account moves to the Free plan; learning data is kept.",
        "An upgrade takes effect right after the extra payment. A downgrade or a change of period takes effect from the start of the next period.",
      ],
    },
    {
      id: "refund",
      title: "Cancellation and refunds",
      items: [
        "The User may withdraw from the contract at any time by deleting the Account or turning off auto-renewal. Termination is governed by Article 707 of the Civil Code of the Republic of Uzbekistan.",
        "If the User withdraws from a paid Subscription or the services are not provided properly, the User may ask the Provider for a refund. Consumer rights when the terms of a services contract are breached are set by Article 19 of Law of the Republic of Uzbekistan No. 221-I “On Protection of Consumer Rights” of 26.04.1996, and for sales through information systems by Article 28-1 of the same Law.",
        "Refunds are made by the same method as the payment, in accordance with Article 27 of the Law “On Electronic Commerce”.",
      ],
    },
    {
      id: "duties",
      title: "Rights and obligations of the parties",
      items: [
        "The Provider undertakes to give the User complete and accurate information about the services and their prices (Article 4 of the Law “On Protection of Consumer Rights”, Article 9 of the Law “On Electronic Commerce”), to keep the Service running and to protect personal data.",
        "The Provider may carry out maintenance and change the interface and features, provided that what the paid Plan includes is not reduced during the paid period.",
        "The User undertakes to give a valid email address, not to share access to the Account with others and not to use the Service in breach of the laws of the Republic of Uzbekistan.",
      ],
    },
    {
      id: "liability",
      title: "Liability and force majeure",
      items: [
        "The parties are liable for non-performance or improper performance of their obligations under the laws of the Republic of Uzbekistan. The grounds of liability are set by Article 333 of the Civil Code of the Republic of Uzbekistan.",
        "The parties are released from liability if non-performance is caused by force majeure, as provided by Article 333 of the Civil Code of the Republic of Uzbekistan.",
        "The Provider is not liable for outages caused by telecom operators, payment organisations and other third parties beyond its control.",
      ],
    },
    {
      id: "disputes",
      title: "Disputes",
      items: [
        "Disputes are settled by negotiation. A claim is sent to the Provider’s email address and is reviewed within 10 working days.",
        "If a dispute is not settled, it is heard by a court of the Republic of Uzbekistan under the laws of the Republic of Uzbekistan.",
      ],
    },
    {
      id: "final",
      title: "Final provisions",
      items: [
        "The Provider may change this offer. A new edition is published on this page with its date and applies to Subscriptions paid after it is published.",
        "The User’s personal data is processed under the Privacy Policy, which forms an integral part of this offer.",
      ],
    },
    {
      id: "details",
      title: "Provider details (fictitious)",
      items: [
        "Askar SaaS Corporation LLC is a fictitious legal entity created for a training project.",
        "Address: Tashkent, Republic of Uzbekistan (fictitious).",
        "Taxpayer ID (TIN): 000 000 000 (fictitious). Bank account: 0000 0000 0000 0000 0000 (fictitious).",
        "Email: support@ustoz.example (fictitious address).",
      ],
    },
  ],
};
