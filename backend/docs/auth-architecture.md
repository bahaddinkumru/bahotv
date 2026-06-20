# 🔐 BahoTv Auth Mimarisi

## Genel Bakış

Auth modülü **Access Token + Refresh Token** mimarisini kullanır. Kısa ömürlü access token'lar (15dk) korumalı endpoint'lere erişim sağlarken, uzun ömürlü refresh token'lar (7 gün) yeni access token almak için kullanılır. Refresh token'lar **hashlenip veritabanında saklanır**.

---

## 🗂️ Dosya Yapısı

```
auth/
├── auth.module.ts              ← Modül tanımı, tüm bileşenleri birleştirir
├── auth.controller.ts          ← HTTP endpoint'leri (login/refresh/verify/logout)
├── auth.service.ts             ← Kullanıcı doğrulama & iş mantığı
├── token.service.ts            ← Token üretme, yenileme, iptal
├── entities/
│   └── refresh-token.entity.ts ← RefreshToken DB tablosu
├── guards/
│   ├── jwt-access.guard.ts     ← Access token koruması
│   └── jwt-refresh.guard.ts    ← Refresh token koruması
├── strategies/
│   ├── jwt-access.strategy.ts  ← Access token doğrulama stratejisi
│   └── jwt-refresh.strategy.ts ← Refresh token doğrulama stratejisi
└── dto/
    ├── login.dto.ts
    └── verify.dto.ts
```

---

## 🏗️ Bileşen Mimarisi

```mermaid
graph TB
    subgraph Client["🌐 İstemci (Frontend)"]
        REQ["HTTP Request"]
    end

    subgraph Controller["📡 AuthController"]
        LOGIN["/auth/login (POST)"]
        REFRESH["/auth/refresh (POST)"]
        VERIFY["/auth/verify (POST)"]
        LOGOUT["/auth/logout (POST)"]
    end

    subgraph Guards["🛡️ Guards"]
        JAG["JwtAccessGuard"]
        JRG["JwtRefreshGuard"]
    end

    subgraph Strategies["🎯 Strategies"]
        JAS["JwtAccessStrategy"]
        JRS["JwtRefreshStrategy"]
    end

    subgraph Services["⚙️ Services"]
        AS["AuthService"]
        TS["TokenService"]
    end

    subgraph Entities["💾 Entities (DB)"]
        UE["User"]
        RTE["RefreshToken"]
    end

    subgraph External["📦 Harici"]
        REDIS["Redis (Rate Limit)"]
        MAIL["MailService"]
    end

    REQ --> Controller
    JAG --> JAS
    JRG --> JRS
    JAS -->|"validate()"| UE
    LOGIN --> AS
    REFRESH --> AS
    VERIFY --> AS
    LOGOUT --> AS
    AS -->|"generateTokens()"| TS
    AS -->|"refreshTokens()"| TS
    AS -->|"revokeToken()"| TS
    TS --> RTE
    AS --> REDIS
    AS --> MAIL
    AS --> UE
```

---

## 🗃️ Entity İlişkileri

```mermaid
erDiagram
    USER ||--o{ REFRESH_TOKEN : "has many"

    USER {
        int id PK
        string email UK
        string password
        boolean is_active
        string verification_code
        date verification_code_expires
    }

    REFRESH_TOKEN {
        int id PK
        text tokenHash "bcrypt ile hashlenmiş token"
        int userId FK
        timestamp expiresAt "7 gün sonra"
        timestamp lastUsedAt "Son kullanım zamanı"
        boolean isRevoked "Logout = true"
        timestamp revokedAt
        string replacedByTokenId "Token rotation"
        string ipAddress "Güvenlik logu"
        string userAgent "Cihaz bilgisi"
        timestamp createdAt
    }
```

> **ÖNEMLİ:** Refresh token **asla düz metin** olarak saklanmaz. `bcrypt.hash()` ile hashlenip `tokenHash` sütununa yazılır. Doğrulama sırasında `bcrypt.compare()` kullanılır.

---

## 🔄 Akış Diyagramları

### 1. Login Akışı

```mermaid
sequenceDiagram
    participant C as 🌐 Client
    participant AC as 📡 AuthController
    participant AS as ⚙️ AuthService
    participant US as 👤 UserService
    participant TS as 🔑 TokenService
    participant DB as 💾 Database

    C->>AC: POST /auth/login {email, password}
    Note over AC: @Throttle (3 istek / 2dk)

    AC->>AS: validateUser(email, password)
    AS->>US: findByEmail(email)
    US->>DB: SELECT * FROM users WHERE email = ?
    DB-->>US: User | null
    US-->>AS: User

    AS->>AS: bcrypt.compare(password, user.password)
    alt Şifre yanlış veya kullanıcı yok
        AS-->>AC: ❌ UnauthorizedException
    end
    alt Hesap aktif değil (is_active = false)
        AS-->>AC: ❌ UnauthorizedException
    end

    AS-->>AC: ✅ Doğrulanmış User

    AC->>AS: login(user)
    AS->>TS: generateTokens(user)

    TS->>TS: 1. Geçici refresh token oluştur (JWT sign)
    TS->>TS: 2. bcrypt.hash(tempToken)
    TS->>DB: INSERT INTO refresh_tokens (tokenHash, userId, expiresAt)
    DB-->>TS: tokenId

    TS->>TS: 3. tokenId içeren yeni refresh token oluştur
    TS->>TS: 4. Access token oluştur (15dk)
    TS-->>AS: {accessToken, refreshToken}

    AS-->>AC: {user, access_token, refresh_token}
    AC-->>C: ✅ 200 OK
```

### 2. Token Yenileme (Refresh) Akışı

```mermaid
sequenceDiagram
    participant C as 🌐 Client
    participant AC as 📡 AuthController
    participant AS as ⚙️ AuthService
    participant TS as 🔑 TokenService
    participant DB as 💾 Database

    C->>AC: POST /auth/refresh {refresh_token}
    Note over AC: @Throttle (3 istek / 2dk)

    AC->>AS: refreshTokens(refresh_token)
    AS->>TS: refreshTokens(refresh_token)

    TS->>TS: JWT verify (JWT_REFRESH_SECRET)
    TS->>TS: Token tipi = 'refresh' mı?

    TS->>DB: SELECT * FROM refresh_tokens WHERE id = tokenId
    DB-->>TS: TokenRecord + User

    TS->>TS: isRevoked kontrol
    TS->>TS: expiresAt kontrol
    TS->>TS: bcrypt.compare(token, tokenHash)
    TS->>TS: user.is_active kontrol

    TS->>DB: UPDATE lastUsedAt = now()

    alt Son 1 gün kaldı (Token Rotation)
        TS->>TS: Eski token'ı revoke et
        TS->>TS: Yeni token çifti üret
        TS->>DB: INSERT yeni refresh_token
        TS->>DB: UPDATE eski token (isRevoked, replacedByTokenId)
        TS-->>AS: {yeni accessToken, yeni refreshToken}
    else Süre yeterli
        TS->>TS: Sadece yeni access token üret
        TS-->>AS: {yeni accessToken, aynı refreshToken}
    end

    AS-->>AC: {access_token, refresh_token}
    AC-->>C: ✅ 200 OK
```

### 3. Korumalı Endpoint Erişimi (Guards & Strategies)

```mermaid
sequenceDiagram
    participant C as 🌐 Client
    participant G as 🛡️ JwtAccessGuard
    participant S as 🎯 JwtAccessStrategy
    participant US as 👤 UserService
    participant H as 📡 Controller Handler

    C->>G: Request + Authorization: Bearer <access_token>

    G->>G: @Public() kontrol (Reflector)
    alt Public endpoint
        G-->>H: ✅ Geç
    end

    G->>S: canActivate → validate()
    S->>S: JWT verify (JWT_ACCESS_SECRET)
    S->>S: Token tipi = 'access' mı?

    S->>US: findOne(payload.sub)
    US-->>S: User

    alt User yok veya is_active = false
        S-->>C: ❌ 401 Unauthorized
    end

    S-->>G: ✅ user nesnesi → req.user
    G-->>H: ✅ İsteği geçir
    H-->>C: 200 OK + Response
```

### 4. Logout Akışı

```mermaid
sequenceDiagram
    participant C as 🌐 Client
    participant AC as 📡 AuthController
    participant AS as ⚙️ AuthService
    participant TS as 🔑 TokenService
    participant DB as 💾 Database

    C->>AC: POST /auth/logout {refresh_token}
    AC->>AS: logout(refresh_token)
    AS->>TS: revokeToken(refresh_token)

    TS->>TS: JWT decode → tokenId çıkar
    TS->>DB: UPDATE refresh_tokens SET isRevoked=true WHERE id=tokenId

    TS-->>AS: ✅ Token iptal edildi
    AS-->>AC: {message: "Çıkış başarılı"}
    AC-->>C: ✅ 200 OK

    Note over C: Client'ta access_token ve<br/>refresh_token silinmeli!
```

---

## 🧩 Bileşen Detayları

| Bileşen | Dosya | Rolü |
|---------|-------|------|
| **AuthController** | `auth.controller.ts` | 4 endpoint sunar: `login`, `refresh`, `verify`, `logout`. Rate limiting uygular |
| **AuthService** | `auth.service.ts` | Kullanıcı doğrulama, email verification, Redis ile deneme sayacı |
| **TokenService** | `token.service.ts` | Token CRUD: üretme, yenileme, iptal etme, temizleme |
| **JwtAccessGuard** | `guards/jwt-access.guard.ts` | `@Public()` decorator kontrol eder, erişim koruması sağlar |
| **JwtRefreshGuard** | `guards/jwt-refresh.guard.ts` | Refresh token koruması (body'den token alır) |
| **JwtAccessStrategy** | `strategies/jwt-access.strategy.ts` | Bearer header'dan access token doğrular, DB'den user çeker |
| **JwtRefreshStrategy** | `strategies/jwt-refresh.strategy.ts` | Body'deki refresh token'ı doğrular |
| **RefreshToken Entity** | `entities/refresh-token.entity.ts` | Token hash, expiry, revoke durumu, rotation takibi |
| **JwtPayload** | `interfaces/jwt-payload.interface.ts` | `{sub, email, type, tokenId?}` |
| **Tokens** | `interfaces/tokens.interface.ts` | `{accessToken, refreshToken}` |

---

## 🔒 Güvenlik Önlemleri

| Özellik | Uygulama |
|---------|----------|
| **Token Hashing** | Refresh token bcrypt ile hashlenip DB'ye kaydedilir |
| **Token Rotation** | Son 1 gün kalan refresh token otomatik yenilenir |
| **Rate Limiting** | `@Throttle` ile login, refresh, verify sınırlanır |
| **Timing Attack Koruması** | `validateUser()` kullanıcı bulunamazsa bile dummy hash ile compare yapar |
| **Token Revocation** | Logout'ta token DB'de revoke edilir, tekrar kullanılamaz |
| **Verification Brute Force** | Redis ile 5 yanlış denemede 10dk blok |
