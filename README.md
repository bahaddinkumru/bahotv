# 🚀 BahoTv - Üniversite Öğrencileri İçin Anonim Görüntülü Sohbet ve Sosyal Etkileşim Platformu

[![NestJS](https://img.shields.io/badge/Backend-NestJS%2011-red?style=for-the-badge&logo=nestjs)](https://nestjs.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%26%20Vite%206-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Redis](https://img.shields.io/badge/Cache%20%26%20Queue-Redis%20Alpine-red?style=for-the-badge&logo=redis)](https://redis.io/)
[![Kafka](https://img.shields.io/badge/Message%20Broker-Apache%20Kafka%203.7-orange?style=for-the-badge&logo=apachekafka)](https://kafka.apache.org/)
[![Gemini](https://img.shields.io/badge/AI%20Moderation-Gemini%202.5%20Flash-purple?style=for-the-badge&logo=googlegemini)](https://deepmind.google/technologies/gemini/)
[![Postgres](https://img.shields.io/badge/Database-PostgreSQL%2014-blue?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)

**BahoTv**, Sakarya Üniversitesi (SAÜ) ve Sakarya Uygulamalı Bilimler Üniversitesi (SUBÜ) öğrencilerine özel olarak tasarlanmış; e-posta doğrulama filtreli, gelişmiş yapay zeka denetimli ve tamamen anonim anlık görüntülü sohbet platformudur. 

Proje; **Web (Vite + React)** ve yüksek ölçeklenebilir **Mikroservis benzeri Modüler Monolit Backend (NestJS)** katmanlarından oluşmaktadır.

---

## 🏗️ Sistem Mimarisi ve Teknoloji Yığını

BahoTv, yüksek trafikli anlık eşleşmeleri ve asenkron iş yüklerini minimum gecikmeyle yönetmek üzere tasarlanmış modern bir mimariye sahiptir.

```mermaid
flowchart TB
    %% Kullanıcı Arayüzleri
    subgraph Clients [Kullanıcı İstemcileri]
        Web[React + Vite Web App]
    end

    %% Ağ Geçidi ve Sunucu
    subgraph Server [Backend Katmanı - NestJS]
        Gateway[Socket.io WebSocket Gateway]
        REST[REST API Controller]
        QueueService[Eşleşme Servisi]
        AIConsumer[Kafka AI Moderation Consumer]
    end

    %% Veri ve Mesajlaşma Katmanları
    subgraph Data [Veri & İletişim Katmanları]
        Redis[("Redis (Önbellek, Eşleşme Kuyrukları, Kilitleme)")]
        DB[("PostgreSQL (Kullanıcı Verileri, Şikayetler)")]
        Kafka[["Apache Kafka (Asenkron Olay Kuyruğu)"]]
    end

    %% Yapay Zeka Moderatör
    subgraph AI [Moderatör Servisi]
        Gemini[Google Gemini 2.5 Flash API]
    end

    %% Bağlantılar
    Web <-->|"REST API / WebRTC Sinyalleşme"| REST
    Web <-->|"WebSocket Bağlantısı"| Gateway

    Gateway <-->|"Kuyruk Ekleme & Durum Kontrolü"| Redis
    QueueService <-->|"Deterministik Kilitleme (SET NX)"| Redis
    
    REST <-->|"Kullanıcı Profil ve Loglar"| DB
    Gateway <-->|"Şikayet & Kanıt Kayıtları"| DB
    
    Gateway -->|"Şikayet Oluştuğunda Görsel Analiz Olayı"| Kafka
    Kafka -->|"analyze_nsfw_image Olay Tüketimi"| AIConsumer
    AIConsumer <-->|"Ekran Görüntüsü NSFW Kontrolü"| Gemini
    AIConsumer -->|"Cezai Aksiyon (Force Logout & Ban)"| Gateway
```

### 🛠️ Teknoloji Kartı
- **Backend:** NestJS, TypeScript, TypeORM, Socket.io, Kafkajs, Nodemailer.
- **Frontend (Web):** React 18, Vite 6, Tailwind CSS 4, Radix UI (Shadcn UI stili), Lucide Icons, Recharts (Admin Analitiği), Socket.io Client.
- **Altyapı & Veri:** PostgreSQL 14, Redis Alpine (ioredis), Apache Kafka 3.7.0 (KRaft modu ile zookeepersız kurulum), Docker Compose.
- **Yapay Zeka Modeli:** Google Gemini (`gemini-2.5-flash`) API.

---

## 🌟 Öne Çıkan Gelişmiş Özellikler

### 1. ⚡ Deterministik Kilitleme Destekli Akıllı Eşleşme
- **Redis Tabanlı Kuyruk:** Kullanıcılar `find_match` isteği gönderdiklerinde Redis üzerinde üniversite ve cinsiyet filtrelerine göre dinamik setlerde sıraya alınır.
- **Yarış Durumu (Race Condition) Önleme:** Redis'in `SET NX` komutu kullanılarak deterministik kilit mekanizması işletilir.
- **Hızlı Kesişim Sorgusu:** Redis'in `SINTER` ve `SRANDMEMBER` yetenekleri kullanılarak milisaniyeler içinde optimize eşleşme sağlanır.

### 2. 📹 WebRTC Peer-to-Peer Görüntülü Sohbet
- Kullanıcılar eşleştiğinde, video ve ses verileri doğrudan tarayıcıdan tarayıcıya (**P2P**) akar.
- Sunucu, yalnızca sinyalleşme (Offer, Answer, ICE Candidates) aşamasında **Socket.io** üzerinden aracı rol oynar.

### 3. 🤖 Yapay Zeka Gücüyle Otomatik Moderasyon
- **Kanıt Yakalama:** Şikayet anında otomatik ekran görüntüsü alınır.
- **Kafka Asenkron İşleme:** Görüntü analizi sistemi yavaşlatmamak için asenkron olarak kuyruğa alınır.
- **Gemini AI Analizi:** **Google Gemini 2.5 Flash** modeli görüntüyü NSFW/Çıplaklık/Şiddet açısından analiz eder.
- **Anında Ban:** İhlal durumunda kullanıcı saniyeler içinde sistemden atılır ve kara listeye alınır.

### 4. 📊 Gelişmiş Admin Dashboard & Bakım Modu
- **Canlı Analizler:** Aktif kullanıcı ve şikayet grafikleri.
- **Sistem Tahliyesi:** Bakım modunda tüm soketlere geri sayım uyarısı gönderilir ve güvenli kapanış sağlanır.

---

## 📁 Proje Dosya Yapısı

```text
BahoTv/
├── backend/                  # NestJS Sunucu Kodu
│   ├── src/
│   │   ├── common/           # Enums, Guards, Decorators
│   │   ├── modules/
│   │   │   ├── admin/        # Yönetim ve Moderasyon
│   │   │   ├── auth/         # JWT Kimlik Doğrulama
│   │   │   ├── email/        # Aktivasyon E-postaları
│   │   │   ├── socket/       # WebSocket & Matching Engine
│   │   │   └── user/         # Kullanıcı İşlemleri
│   ├── docker-compose.yml    # Altyapı Servisleri
│   └── package.json
│
└── frontend/                 # React + Vite Web Arayüzü
    ├── src/
    │   ├── admin/            # Admin Paneli
    │   ├── components/       # Ortak UI Bileşenleri
    │   ├── pages/            # Ana Sayfalar
    └── package.json
```

---

## 🚀 Kurulum Rehberi

### Gereksinimler
- [Node.js](https://nodejs.org/) (v18+)
- [Docker Desktop](https://www.docker.com/)

### Adım 1: Servisleri Başlatma
```bash
docker-compose up -d
```

### Adım 2: Backend Yapılandırması
1. `backend` dizinine gidin: `cd backend`
2. Bağımlılıkları yükleyin: `npm install`
3. `.env.example` dosyasını `.env` olarak kopyalayın ve gerekli bilgileri doldurun.
4. Başlatın: `npm run start:dev`

### Adım 3: Frontend Yapılandırması
1. `frontend` dizinine gidin: `cd frontend`
2. Bağımlılıkları yükleyin: `npm install`
3. `.env.example` dosyasını `.env` olarak kopyalayın.
4. Başlatın: `npm run dev`

---

## 🔒 Güvenlik
- **Üniversite Filtresi:** Sadece kurumsal e-posta ile kayıt.
- **Rate Limiting:** Spam ve saldırılara karşı Redis tabanlı koruma.
- **P2P Gizlilik:** Görüntü verileri sunucuya uğramaz, uçtan uca gizlidir.
