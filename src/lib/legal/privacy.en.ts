import type { LegalDoc } from ".";

export const privacyEn: LegalDoc = {
  title: "Ustoz AI Privacy Policy",
  lead:
    "This Policy explains which personal data of Ustoz AI users is processed by Askar SaaS Corporation LLC (a fictitious entity, the “Operator”), " +
    "for what purposes and how it is protected. It is written in accordance with Law of the Republic of Uzbekistan No. ZRU-547 “On Personal Data” of 02.07.2019 (the “Law”).",
  sections: [
    {
      id: "data",
      title: "What data we process",
      items: [
        "Account data: name, email address, password hash (the password itself is not stored), interface language, sign-up date, and the date and edition of the accepted offer.",
        "Contact data the User adds if they wish: phone number, Telegram ID and username.",
        "Learning data: level, goals, exercise results, mistakes, vocabulary, progress, XP and league position.",
        "Messages in the chat with the AI tutor. Speech for pronunciation practice is recognised by the browser; the Service never receives or stores voice recordings.",
        "Payment data: invoices, amounts, payment statuses, electronic receipts, and the masked number and token of a saved card. The Operator never receives full card details.",
        "Technical data: the session cookie, IP address and browser details in server logs.",
      ],
    },
    {
      id: "purposes",
      title: "Purposes of processing",
      items: [
        "Signing up and signing in, password recovery and email address confirmation.",
        "Providing the services under the offer: a personal study plan, exercise checking, AI tutor answers and progress statistics.",
        "Taking payments, renewing Subscriptions and issuing receipts.",
        "Notifications about payments, Subscription end and learning events — in the app, by email and in Telegram (if connected).",
        "Keeping the Service secure and meeting legal requirements.",
      ],
    },
    {
      id: "grounds",
      title: "Legal basis and consent",
      items: [
        "Personal data is processed with the data subject’s consent. Consent is given electronically when the Account is registered, as provided by Article 21 of the Law, and may be withdrawn at any time.",
        "Withdrawing consent means deleting the Account: the services cannot be provided without Account data.",
      ],
    },
    {
      id: "transfer",
      title: "Sharing with third parties",
      items: [
        "Data is shared only as far as needed to provide the services: with payment organisations and payment systems (Click, Stripe, Uzcard and HUMO card processing) to take payments; with the fiscal data operator to issue receipts; with artificial intelligence model providers — chat messages without the email address or name; with Telegram — notification messages, if the User has connected the bot; with the email service — emails to the User.",
        "Some of these parties are located outside the Republic of Uzbekistan. Cross-border transfer of personal data follows Article 15 of the Law — to states that ensure adequate protection of data subjects’ rights, or with the data subject’s consent, which the User gives when registering.",
        "The Operator does not sell personal data or share it for advertising.",
      ],
    },
    {
      id: "storage",
      title: "Where and how long data is stored",
      items: [
        "Mandatory storage within the Republic of Uzbekistan is required by Article 27-1 of the Law (as amended by Law No. ZRU-1125 of 26.03.2026) for biometric and genetic data and for data of users of telecom operators. The Service does not process these categories; other data is stored in line with the principles of the Law.",
        "Under Article 10 of the Law, data is kept no longer than the purposes of processing require: Account and learning data — until the Account is deleted; payment records and receipts — for the period set by law for accounting and tax documents.",
        "Once the purposes are achieved or consent is withdrawn, the data is destroyed as provided by Article 17 of the Law.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies",
      items: [
        "The Service uses only essential cookies: the session cookie (signing in) and the chosen-language cookie. The chosen colour theme is kept in browser storage. No advertising or third-party analytics cookies are used.",
      ],
    },
    {
      id: "rights",
      title: "Rights of the data subject",
      items: [
        "Under Article 30 of the Law, the User has the right to know whether the Operator holds their personal data and what it consists of, to receive information about its processing, to give and withdraw consent to processing, to demand that processing of incomplete, outdated, inaccurate or unlawfully obtained data be suspended, and to appeal the Operator’s actions to the authorised body or a court.",
        "Most data can be viewed and changed by the User in “Settings”. Other requests are sent to the Operator’s email address and are answered within 10 working days.",
      ],
    },
    {
      id: "security",
      title: "Data protection",
      items: [
        "Passwords are stored only as hashes; one-time links for email confirmation and password reset are stored only as hashes and expire. Connections to the Service are protected with HTTPS.",
        "Only Operator staff who need the data for their work have access to it.",
      ],
    },
    {
      id: "changes",
      title: "Changes to this Policy and contacts",
      items: [
        "A new edition of the Policy is published on this page with its date. The User is notified of material changes in the app.",
        "Operator: Askar SaaS Corporation LLC (a fictitious entity), Tashkent, Republic of Uzbekistan. Email: support@ustoz.example (fictitious address).",
      ],
    },
  ],
};
