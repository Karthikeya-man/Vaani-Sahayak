# Vaani-Sahayak 🌾🗣️

**A Hybrid Omni-Channel Voice Assistant for Rural India**

Vaani-Sahayak is an AI-powered voice assistant specifically designed for farmers and villagers in rural India. Built on a three-pillar architecture, it provides intelligent agricultural assistance through government scheme information and real-time market intelligence, accessible via both Nokia feature phones and smartphones.

## 🎯 Vision

*"Write Once, Serve Everyone"* - A unified backend that seamlessly handles multiple input channels while delivering contextually aware responses in Hindi with an empathetic "Gram-Didi" persona.

## 🏗️ Three-Pillar Architecture

### 1. 📱 Hybrid Interface
- **GSM/PSTN Telephony**: Amazon Connect integration for Nokia feature phones
- **Streamlit/Lite App**: Progressive Web App for smartphones
- **Universal Voice Entry**: Seamless speech-to-text processing regardless of device

### 2. 📋 Scheme Intelligence (RAG)
- **Bedrock Knowledge Bases**: Advanced retrieval-augmented generation for government schemes
- **S3 Document Repository**: Comprehensive storage of government PDF documents
- **Auto-enrollment**: Intelligent slot-filling for scheme applications

### 3. 🏪 ONDC Market Intelligence
- **ONDC Buyer App (BAP)**: Certified integration with ONDC Network Gateways
- **Real-time Price Discovery**: Live Mandi prices through ONDC search protocols
- **Farmer-Buyer Matching**: Direct connections via ONDC select APIs

## 🚀 Key Features

- **Multi-Channel Access**: Works on both Nokia feature phones and smartphones
- **Hindi Language Support**: Optimized for rural Hindi dialects and agricultural terminology
- **Government Scheme Assistance**: Automated eligibility checking and application support
- **Live Market Prices**: Real-time Mandi prices and buyer connections through ONDC
- **Context Awareness**: Remembers user preferences and conversation history
- **Rural-First Design**: Optimized for low bandwidth and intermittent connectivity
- **Privacy by Design**: Automatic data cleanup and minimal data retention

## 🛠️ Technology Stack

### AWS Services
- **Amazon Connect**: Phone call handling and audio streaming
- **Amazon Bedrock Agent**: AI orchestration with specialized action groups
- **Amazon Transcribe**: Speech-to-text with Hindi language support
- **Amazon Polly**: Text-to-speech with neural voices (Kajal/Aditi)
- **Bedrock Knowledge Bases**: RAG-based scheme information retrieval
- **DynamoDB**: User context and conversation history storage
- **S3**: Audio files, documents, and generated forms storage
- **Lambda**: Serverless orchestration and processing

### External Integrations
- **ONDC Network**: Real-time market intelligence and buyer matching
- **Streamlit**: Progressive Web App interface for smartphones

## 📋 Project Structure

```
Vaani-Sahayak/
├── specs/
│   └── vaani-sahayak/
│       ├── requirements.md    # Detailed requirements with 11 core requirements
│       ├── design.md         # Complete architecture and implementation design
│       └── tasks.md          # Implementation task breakdown
└── README.md                 # This file
```

## 🎯 Target Users

- **Primary**: Farmers and villagers in rural India with Nokia feature phones
- **Secondary**: Rural smartphone users with limited data connectivity
- **Use Cases**: 
  - Government scheme eligibility and applications
  - Real-time crop price discovery
  - Direct buyer-farmer connections
  - Agricultural assistance and guidance

## 🌟 User Experience

### For Nokia Phone Users
1. Dial toll-free number
2. Speak in Hindi about schemes or market prices
3. Receive audio responses with practical guidance
4. Get assistance with government applications

### For Smartphone Users
1. Open Streamlit PWA
2. Record audio queries
3. Receive audio responses with visual elements
4. Download generated forms and documents

## 🔧 Core Components

### Orchestrator Lambda
Central processing unit that:
- Detects input source (Nokia/Streamlit)
- Manages Bedrock Agent interactions
- Coordinates action group selection
- Handles response delivery

### Action Groups
- **ActionGroup_Schemes**: Government scheme queries and applications
- **ActionGroup_ONDC**: Market intelligence and buyer connections

### Data Management
- **User Profiles**: Phone number-based identification
- **Conversation History**: Context-aware interactions
- **Scheme Applications**: Progress tracking and form generation
- **Market Preferences**: Price alerts and buyer preferences

## 📊 System Properties

The system is designed with 10 core correctness properties ensuring:
- Multi-channel audio processing consistency
- Complete pipeline execution reliability
- Accurate intent classification and routing
- Comprehensive error handling and recovery
- Security and privacy compliance

## 🔒 Security & Privacy

- **Data Encryption**: At rest and in transit
- **Minimal Permissions**: IAM roles with least privilege
- **Automatic Cleanup**: Audio files deleted after 24 hours
- **PII Protection**: Secure handling of personal information
- **Compliance**: ONDC network security standards

## 📈 Performance Optimizations

- **Rural Network Resilience**: Retry mechanisms for intermittent connectivity
- **Audio Compression**: Optimized for low-bandwidth transmission
- **Response Caching**: Common responses cached for faster delivery
- **Cost Optimization**: Efficient resource usage for affordability

## 🚀 Getting Started

> **Note**: This repository contains the specification and design documents. Implementation is in progress.

1. **Review Requirements**: Start with `specs/vaani-sahayak/requirements.md`
2. **Understand Architecture**: Read `specs/vaani-sahayak/design.md`
3. **Implementation Plan**: Check `specs/vaani-sahayak/tasks.md`

## 🤝 Contributing

This project aims to bridge the digital divide in rural India. Contributions focusing on:
- Rural accessibility improvements
- Hindi language optimization
- Agricultural domain expertise
- ONDC integration enhancements

## 📞 Contact

For questions about rural implementation, agricultural use cases, or ONDC integration, please open an issue.

---

**Built with ❤️ for Rural India** 🇮🇳

*Empowering farmers and villagers through accessible AI technology*