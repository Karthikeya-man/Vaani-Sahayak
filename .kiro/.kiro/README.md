# Vaani-Sahayak 🌾🗣️

**An Enterprise-Grade Hybrid Omni-Channel Voice Assistant for Rural India**

Vaani-Sahayak is an AI-powered voice assistant specifically designed for farmers and villagers in rural India. Built on a three-pillar architecture with enterprise-grade performance, intelligence, and observability capabilities, it provides intelligent agricultural assistance through government scheme information, real-time market intelligence, visual analysis, and weather data, accessible via both Nokia feature phones and smartphones in 22 Indian languages.

## 🎯 Vision

*"Write Once, Serve Everyone"* - A unified backend that seamlessly handles multiple input channels while delivering contextually aware responses in 22 Indian languages with an empathetic "Gram-Didi" persona, powered by intelligent language routing, performance caching, and comprehensive safety guardrails.

## 🏗️ Three-Pillar Architecture

### 1. 📱 Hybrid Interface with Unified Entry Layer
- **AWS Amplify**: Frontend management for web and mobile entry points
- **GSM/PSTN Telephony**: Amazon Connect integration for Nokia feature phones
- **Streamlit/Lite App**: Progressive Web App for smartphones
- **Language Router**: Intelligent routing between Bhashini API (22 languages) and AWS services
- **Universal Voice Entry**: Seamless multilingual speech-to-text processing

### 2. 📋 Scheme Intelligence (RAG) with Visual Intelligence
- **Bedrock Knowledge Bases**: Advanced retrieval-augmented generation for government schemes
- **S3 Document Repository**: Comprehensive storage of government PDF documents
- **Auto-enrollment**: Intelligent slot-filling for scheme applications
- **Amazon Rekognition**: Crop disease detection and form OCR
- **Bedrock Guardrails**: Content safety and rural sensitivity filtering

### 3. 🏪 ONDC Market Intelligence with Real-time Data
- **ONDC Buyer App (BAP)**: Certified integration with ONDC Network Gateways
- **Real-time Price Discovery**: Live Mandi prices through ONDC search protocols
- **Farmer-Buyer Matching**: Direct connections via ONDC select APIs
- **IMD Weather Integration**: Live weather data and agricultural advisories
- **ElastiCache Layer**: Redis caching for performance optimization

## 🚀 Key Features

### Core Capabilities
- **Multi-Channel Access**: Works on both Nokia feature phones and smartphones
- **22 Indian Languages**: Bhashini API integration with AWS fallback for comprehensive language support
- **Government Scheme Assistance**: Automated eligibility checking and application support
- **Live Market Prices**: Real-time Mandi prices and buyer connections through ONDC
- **Weather Intelligence**: IMD weather data with crop-specific recommendations
- **Visual Analysis**: Crop disease detection and government form OCR

### Performance & Intelligence
- **Sub-second Responses**: Redis caching for FAQs (24h), market prices (6h), and schemes (24h)
- **Content Safety**: Bedrock Guardrails ensuring rural-appropriate responses
- **Context Awareness**: Enhanced session management and user profiles
- **Offline Notifications**: SMS alerts for price changes, weather warnings, and scheme deadlines

### Enterprise Features
- **Comprehensive Observability**: CloudWatch logging, X-Ray tracing, QuickSight analytics
- **Enhanced Data Schema**: user_sessions, government_forms, user_profiles, feedback_analytics
- **Rural-First Design**: Optimized for low bandwidth and intermittent connectivity
- **Privacy by Design**: Automatic data cleanup, PII anonymization, and minimal data retention

## 🛠️ Technology Stack

### AWS Services
- **AWS Amplify**: Frontend management for web and mobile entry points
- **Amazon Connect**: Phone call handling and audio streaming
- **Amazon Bedrock Agent**: AI orchestration with specialized action groups and guardrails
- **Amazon Transcribe**: Speech-to-text (fallback for 22 languages)
- **Amazon Polly**: Text-to-speech with neural voices (fallback)
- **Bedrock Knowledge Bases**: RAG-based scheme information retrieval
- **Amazon Rekognition**: Crop disease detection and form OCR
- **ElastiCache (Redis)**: Performance caching layer for FAQs, prices, and schemes
- **DynamoDB**: Enhanced schema with user_sessions, government_forms, user_profiles, feedback_analytics
- **S3**: Audio files, documents, images, and generated forms storage
- **Lambda**: Serverless orchestration, language routing, and processing
- **Amazon SNS**: SMS gateway for offline notifications
- **CloudWatch**: Comprehensive logging and metrics
- **AWS X-Ray**: Distributed tracing for performance monitoring
- **Amazon QuickSight**: Analytics dashboards for user engagement and satisfaction

### External Integrations
- **Bhashini API**: Primary ASR/TTS for 22 Indian languages (Government of India)
- **ONDC Network**: Real-time market intelligence and buyer matching
- **IMD Weather API**: Live weather data and agricultural advisories
- **Streamlit**: Progressive Web App interface for smartphones

## 📋 Project Structure

```
Vaani-Sahayak/
├── specs/
│   └── vaani-sahayak/
│       ├── requirements.md    # 19 detailed requirements with enterprise features
│       ├── design.md         # Complete architecture with enterprise components
│       └── tasks.md          # Implementation task breakdown
└── README.md                 # This file
```

## 🎯 Target Users

- **Primary**: Farmers and villagers in rural India with Nokia feature phones
- **Secondary**: Rural smartphone users with limited data connectivity
- **Use Cases**: 
  - Government scheme eligibility and applications
  - Real-time crop price discovery and buyer matching
  - Crop disease diagnosis and treatment recommendations
  - Weather forecasts and agricultural advisories
  - Government form digitization via OCR
  - Direct buyer-farmer connections

## 🌟 User Experience

### For Nokia Phone Users
1. Dial toll-free number
2. Speak in any of 22 Indian languages about schemes, market prices, or weather
3. Receive audio responses with practical guidance
4. Get SMS notifications for price alerts, weather warnings, and scheme deadlines
5. Assistance with government applications through conversational slot-filling

### For Smartphone Users
1. Open Streamlit PWA (managed by AWS Amplify)
2. Record audio queries or upload crop/form images
3. Receive audio responses with visual elements
4. Get crop disease diagnosis with treatment recommendations
5. Download generated forms and documents
6. Track scheme application status

## 🔧 Core Components

### Language Router Lambda
Intelligent routing between Bhashini API (primary) and AWS Transcribe/Polly (fallback) for 22 Indian languages with automatic failover and performance monitoring.

### Orchestrator Lambda
Central processing unit that:
- Detects input source (Nokia/Streamlit)
- Manages Bedrock Agent interactions with Guardrails
- Coordinates action group selection
- Handles caching and response delivery
- Triggers SMS notifications

### Action Groups
- **ActionGroup_Schemes**: Government scheme queries and applications via Knowledge Bases
- **ActionGroup_ONDC**: Market intelligence, buyer connections, and weather data
- **ActionGroup_Visual**: Crop disease detection and form OCR via Rekognition

### Caching Layer (ElastiCache Redis)
- **FAQs**: 24-hour TTL for common questions
- **Market Prices**: 6-hour TTL for ONDC data
- **Scheme Information**: 24-hour TTL for Knowledge Base results
- **Weather Data**: 1-hour TTL for IMD forecasts

### Enhanced Data Management
- **user_sessions**: Active session tracking with conversation state
- **government_forms**: Form lifecycle from OCR to submission
- **user_profiles**: Comprehensive user preferences and interaction history
- **feedback_analytics**: User satisfaction metrics for continuous improvement

## 📊 System Properties

The system is designed with 10 core correctness properties ensuring:
- Multi-channel audio processing consistency
- Multilingual pipeline execution reliability
- Accurate intent classification and routing
- Visual intelligence accuracy for crops and forms
- Comprehensive error handling and recovery
- Content safety and rural sensitivity
- Security and privacy compliance
- Performance optimization through caching

## 🔒 Security & Privacy

- **Bedrock Guardrails**: Content filtering for rural appropriateness
- **PII Anonymization**: Automatic anonymization of Aadhaar, bank accounts, phone numbers
- **Data Encryption**: At rest and in transit
- **Minimal Permissions**: IAM roles with least privilege
- **Automatic Cleanup**: Audio files deleted after 24 hours, forms after 30 days
- **Compliance**: ONDC network security standards and government data protection

## 📈 Performance Optimizations

- **Redis Caching**: Sub-second responses for cached queries (60%+ cache hit rate target)
- **Language Router**: Intelligent failover between Bhashini and AWS services
- **Rural Network Resilience**: Retry mechanisms for intermittent connectivity
- **Audio Compression**: Optimized for low-bandwidth transmission
- **Async Processing**: Non-blocking operations for improved throughput
- **Cost Optimization**: Efficient resource usage for affordability

## 📊 Observability & Analytics

### CloudWatch Metrics
- Response latency by action group and cache status
- ASR/TTS service usage and failover rates
- Error rates by component
- Cache hit ratios

### X-Ray Tracing
- End-to-end request tracing
- Performance bottleneck identification
- Service dependency mapping

### QuickSight Dashboards
- User engagement and satisfaction trends
- Language and channel distribution
- Scheme application success rates
- Market transaction volumes
- Regional adoption heat maps

## 🚀 Getting Started

> **Note**: This repository contains the specification and design documents. Implementation is in progress.

1. **Review Requirements**: Start with `specs/vaani-sahayak/requirements.md` (19 requirements)
2. **Understand Architecture**: Read `specs/vaani-sahayak/design.md` (enterprise components)
3. **Implementation Plan**: Check `specs/vaani-sahayak/tasks.md`

## 🤝 Contributing

This project aims to bridge the digital divide in rural India. Contributions focusing on:
- Rural accessibility improvements
- Multilingual optimization (22 Indian languages)
- Agricultural domain expertise
- ONDC integration enhancements
- Performance and caching strategies
- Visual intelligence for crop diseases

## 📞 Contact

For questions about rural implementation, agricultural use cases, ONDC integration, or Bhashini API integration, please open an issue.

---

**Built with ❤️ for Rural India** 🇮🇳

*Empowering farmers and villagers through accessible, intelligent, and enterprise-grade AI technology*
