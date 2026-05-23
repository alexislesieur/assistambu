# Architecture Karnetik — Documentation Technique

> Document de référence pour reproduire cette architecture sur un autre domaine métier.

---

## 1. Vue d'ensemble

Karnetik est une application SaaS web française organisée en **monorepo multi-applications** :

```
Projet/
├── Api/      → Laravel 11 (API JSON, source de vérité)
├── App/      → Next.js 16 (application utilisateur finale)
├── Admin/    → Next.js 16 (back-office interne)
├── Auth/     → Next.js 16 (SSO centralisé, login/register/reset)
├── Web/      → Next.js 16 (vitrine marketing + waitlist)
├── deploy.sh → Script de déploiement automatique (rsync + build)
└── docker-compose.yml → MySQL + phpMyAdmin (dev local uniquement)
```

Chaque application est **indépendante** : build séparé, déploiement séparé, sous-domaine dédié.

### Principe directeur

L'API est l'unique source de vérité. Les frontends sont des shells statiques (HTML/CSS/JS) qui consomment l'API via `fetch`. Aucun SSR, aucun serveur Node en production : tout est exporté en statique (`output: "export"`) et servi par Nginx.

---

## 2. Stack technique

| Couche | Technologie | Pourquoi |
|---|---|---|
| Backend | Laravel 11, PHP 8.4 | ORM puissant, Auth Sanctum intégrée, Cashier pour Stripe |
| Auth API | Laravel Sanctum | Tokens Bearer stateless, simple à implémenter côté SPA |
| Paiements | Laravel Cashier + Stripe | Abonnements récurrents, portail client, factures |
| Frontend | Next.js 16, TypeScript, Tailwind v4 | App Router, export statique, écosystème riche |
| Base de données | MySQL 8 | Fiabilité, support Laravel natif |
| Emails | SMTP Infomaniak + Laravel Mail | Hébergeur FR, conformité RGPD |
| Déploiement | VPS Ubuntu 24.04, Nginx, Let's Encrypt | Contrôle total, coût maîtrisé |
| Dev local | Docker Compose | MySQL + phpMyAdmin sans installation locale |

---

## 3. Architecture API (Laravel)

### Structure des dossiers

```
Api/app/
├── Http/
│   ├── Controllers/
│   │   ├── Api/           → Controllers utilisateurs
│   │   └── Api/Admin/     → Controllers admin (préfixe /admin)
│   ├── Middleware/
│   │   └── IsAdmin.php    → Vérifie is_admin = true
│   ├── Requests/          → Form Requests (validation)
│   └── Resources/         → API Resources (formatage JSON)
├── Models/                → Eloquent models
├── Mail/                  → Mailable classes
└── Services/              → Logique métier complexe
```

### Routes API (`routes/api.php`)

Trois zones :

```php
// Zone publique — pas d'auth
Route::post('register', ...);
Route::post('login', ...);
Route::post('forgot-password', ...);
Route::post('waitlist', ...);

// Zone utilisateur — auth:sanctum
Route::middleware('auth:sanctum')->group(function () {
    // ressources utilisateur (CRUD)
    Route::apiResource('vehicles', VehicleController::class);
    // ...
});

// Zone admin — auth:sanctum + IsAdmin
Route::middleware([IsAdmin::class])->prefix('admin')->group(function () {
    // gestion plateforme
});
```

### Modèle User

Champs clés à adapter selon le domaine :

```php
protected $fillable = [
    'first_name',
    'email',
    'password',
    'is_premium',        // accès fonctions payantes
    'premium_expires_at',
    'is_admin',          // accès back-office
    'is_locked',         // compte suspendu par admin
    'last_login_at',
    // Stripe/Cashier
    'stripe_id',
    'pm_type',
    'pm_last_four',
    'trial_ends_at',
];
```

Traits utilisés : `HasApiTokens` (Sanctum), `Billable` (Cashier), `HasFactory`, `Notifiable`.

### Conventions de stockage numérique

Stocker les valeurs monétaires et mesures en entiers pour éviter les flottants :

| Valeur | Unité stockée | Exemple |
|---|---|---|
| Prix (€) | Centimes | 14200 = 142,00 € |
| Volume (L) | Centilitres | 4520 = 45,20 L |
| Prix/L | Millièmes | 1879 = 1,879 €/L |

→ Diviser à l'affichage, jamais stocker de float pour les montants.

### Middleware IsAdmin

```php
// app/Http/Middleware/IsAdmin.php
public function handle(Request $request, Closure $next): Response
{
    if (!$request->user()?->is_admin) {
        return response()->json(['message' => 'Forbidden'], 403);
    }
    return $next($request);
}
```

### Sécurité production

```php
// AppServiceProvider::boot()
DB::prohibitDestructiveCommands($this->app->isProduction());
```

---

## 4. Architecture Auth (SSO centralisé)

Auth est un frontend Next.js dédié. Toutes les applications redirigent vers `auth.domaine.com` si l'utilisateur n'est pas connecté.

### Pages Auth

```
/           → Login
/register   → Inscription
/forgot-password → Demande reset
/reset-password  → Nouveau mot de passe (token URL)
```

### Flow d'authentification

```
1. Utilisateur sur app.domaine.com sans token
2. Redirect → auth.domaine.com?redirect=app.domaine.com/page
3. Formulaire login → POST api.domaine.com/login
4. API retourne { token, user }
5. Auth stocke token dans localStorage (clé : domaine_token)
6. Auth redirige vers l'URL d'origine
7. App lit le token, fait GET /me pour valider
```

### Stockage des tokens

- `App` → `karnetik_token` dans `localStorage`
- `Admin` → `admin_token` dans `localStorage`
- Header systématique : `Authorization: Bearer <token>`

---

## 5. Architecture App (utilisateur)

### Pages principales

```
/               → Dashboard (résumé + véhicule actif)
/bienvenue      → Onboarding (premier véhicule)
/garage         → Liste véhicules
/garage/vehicule         → Fiche véhicule
/garage/vehicule/modifier
/garage/ajouter
/garage/transferer       → Transfert de propriété
/garage/entretien/ajouter
/garage/entretien/modifier
/garage/carburant/ajouter
/garage/carburant/modifier
/entretiens     → Tous les entretiens (multi-véhicules)
/carburants     → Tous les pleins
/statistiques   → Stats agrégées
/premium        → Page abonnement
/premium/success
/compte         → Profil utilisateur
/compte/feedback
/compte/support → Tickets
/compte/support/nouveau
/compte/support/detail
```

### Navigation

- Desktop : `Navbar` (barre latérale ou topbar)
- Mobile : `MobileHeader` (haut) + `BottomNav` (barre de navigation bas)

### Routes dynamiques

Pas de segments dynamiques (`[id]`) car export statique. Utiliser les query params :

```
/garage/vehicule?id=42
/garage/entretien/modifier?id=7&vehicleId=42
```

### Apostrophes et Tailwind dans JSX

```tsx
// Apostrophes dans JSX — échapper
<p>{"Votre véhicule n'a pas d'entretien"}</p>

// Longues classes Tailwind — variable pour éviter bug parser
const cardClass = [
  "bg-white",
  "rounded-md",
  "border border-plomb/10",
].join(" ");
```

---

## 6. Architecture Admin (back-office)

### Pages Admin

```
/               → Dashboard (KPIs plateforme)
/utilisateurs   → Liste + gestion comptes
/vehicules      → Tous les objets métier
/entretiens     → Audit des entrées
/carburants
/abonnements    → Stripe subscriptions
/statistiques   → Stats plateforme
/liste-attente  → Waitlist management
/enseignes      → Référentiel données (garages, stations)
/tickets        → Support client
/tickets/detail
/journaux       → Activity logs
/lancement      → Envoi emails lancement
/maintenance    → Status services
```

### Sidebar Admin

Mode sombre (`bg-carbone`), contrairement aux apps utilisateur (mode clair `bg-craie`).

---

## 7. Architecture Web (vitrine)

### Pages vitrine

```
/                   → Landing page + CTA waitlist
/fonctionnalites    → Features
/tarifs             → Pricing
/a-propos           → À propos
/cgu                → CGU
/mentions-legales
/donnees-personnelles → RGPD
/waitlist/verify    → Confirmation email waitlist
```

### Flow Waitlist

```
1. Formulaire email → POST /api/waitlist
2. API envoie email avec lien vérification
3. Clic lien → GET /api/waitlist/verify?token=xxx
4. Statut BDD : pending → confirmed
5. Admin envoie email lancement depuis /admin/lancement
```

---

## 8. Modèle de données

### Entités core (à adapter selon domaine)

```sql
-- users : compte + abonnement
users (id, first_name, email, password, is_premium, is_admin, is_locked, stripe_id, ...)

-- entité principale (ex: vehicles)
vehicles (id, user_id nullable, brand, model, license_plate, is_active, current_mileage, ...)
-- user_id nullable → véhicule peut être sans propriétaire (dissocié)
-- is_active → jamais supprimer, seulement désactiver

-- entrées liées à l'entité (ex: maintenances)
maintenances (id, vehicle_id, user_id, type, date, mileage, cost_cents, is_locked, ...)
-- is_locked → verrouillé après 48h via commande artisan

-- autres entrées (ex: fuels)
fuels (id, vehicle_id, user_id, date, mileage, volume_cl, price_per_liter_m, cost_cents, is_full, ...)

-- rappels
rappels (id, vehicle_id, type, trigger_mileage, trigger_date, is_done, ...)

-- transferts (ownership transfer)
vehicle_transfers (id, vehicle_id, from_user_id, to_email, token, status, expires_at, ...)

-- support
tickets (id, user_id, type, subject, status, metadata JSON, ...)
ticket_messages (id, ticket_id, sender_id, sender_type, body, ...)

-- plateforme
waitlist (id, email, token, status, verified_at, ...)
service_statuses (id, service, is_maintenance, ...)
activity_logs (id, user_id, action, entity_type, entity_id, metadata JSON, ...)
email_logs (id, user_id, email, type, status, sent_at, ...)
garage_chains (id, name, category, is_active, ...)  -- référentiel données
```

### Patterns de migration

```php
// Soft-delete via flag — jamais supprimer
$table->boolean('is_active')->default(true);

// Ownership nullable — entité peut exister sans propriétaire
$table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

// Verrouillage temporel
$table->boolean('is_locked')->default(false);

// Métadonnées flexibles pour les tickets/logs
$table->json('metadata')->nullable();
```

---

## 9. Abonnements Stripe (Laravel Cashier)

### Flow checkout

```
1. POST /subscription/checkout → crée session Stripe Checkout
2. Redirect vers Stripe hosted page
3. Paiement → redirect GET /subscription/verify-checkout?session_id=xxx
4. API vérifie session, active premium, retourne nouveau token
5. App met à jour localStorage
```

### Endpoints abonnement

```
GET  /subscription/status           → état actuel + plan
GET  /subscription/invoices         → historique factures
POST /subscription/checkout         → créer session checkout
GET  /subscription/verify-checkout  → confirmer après paiement
POST /subscription/cancel           → résilier (fin période)
POST /subscription/resume           → annuler résiliation
POST /subscription/update-payment-method
POST /subscription/billing-portal   → portail Stripe self-service
POST /subscription/select-vehicle   → choisir véhicule actif (free tier)
```

### Règle free vs premium

```php
// User::isPremium()
public function isPremium(): bool
{
    if ($this->subscribed('default')) return true;
    return $this->is_premium && (
        $this->premium_expires_at === null ||
        $this->premium_expires_at->isFuture()
    );
}
```

Free tier : 1 objet max. Premium : illimité. Contrôle dans le controller avant création.

---

## 10. Déploiement

### Infrastructure VPS

```
/var/www/projet/
├── api/          → Laravel (PHP-FPM)
├── app/          → Next.js out/ (statique)
├── admin/        → Next.js out/ (statique)
├── auth/         → Next.js out/ (statique)
└── web/          → Next.js out/ (statique)
```

Nginx sert les frontends statiques directement. PHP-FPM gère uniquement l'API Laravel.

### Script deploy.sh — pattern

```bash
# 1. Activer maintenance via API
curl -X PUT $API_URL/admin/services/app/maintenance -d '{"is_maintenance": true}'

# 2. Build frontend
cp .env.production .env.local
npm run build
# → génère /out

# 3. Upload via rsync
rsync -avz --delete out/ vps:/var/www/projet/app/

# 4. Désactiver maintenance
curl -X PUT $API_URL/admin/services/app/maintenance -d '{"is_maintenance": false}'
```

### Variables d'environnement

Chaque frontend a :
- `.env.local` → dev (URLs localhost)
- `.env.production` → prod (URLs domaine réel, intégrées au build)

Les `.env.production` ne sont **pas** commitées. L'API a `Api/.env.production` copié en `.env` sur le VPS.

### Commandes artisan utiles à prévoir

```bash
php artisan migrate:fresh --seed    # reset dev
php artisan tinker                   # console interactive
php artisan route:list               # audit routes
php artisan queue:work               # si jobs async
# Commande métier custom (ex: verrouillage)
php artisan maintenances:lock        # verrouille entrées > 48h
```

---

## 11. Charte graphique

### Palette de couleurs

```css
--carbone: #0D0E0D;    /* fond admin dark, texte principal */
--sapin:   #3D8A6F;    /* accent principal (action, CTA) */
--craie:   #ECECE8;    /* fond app clair */
--plomb:   #161817;    /* fond sidebar admin */

--validation: #7FC06B; /* succès */
--alerte:     #E8624A; /* erreur, danger */

/* Texte */
--ink:      #0D0E0D;   /* texte principal */
--ink-soft: #4A4B46;   /* texte secondaire */
--ink-mute: #7A7B76;   /* texte désactivé */
```

### Règles de design

- Coins peu arrondis : `rounded-sm` (3px), `rounded-md` (6px), `rounded-lg` (8px) max
- Bordures fines : `border border-plomb/10` ou `border-zinc-200`
- Pas d'ombres (`shadow-*`) sauf exceptions fonctionnelles
- La couleur verte n'est **jamais** décorative : elle signale une action ou un état actif
- Font mono (`font-mono`) pour données techniques : kilométrage, prix, dates, codes

### Modes d'affichage

- App, Auth, Web : mode clair (`bg-craie`)
- Admin sidebar : mode sombre (`bg-carbone`)

---

## 12. Règles métier transposables

Ces patterns se retrouvent dans tout SaaS avec objets utilisateur :

| Pattern | Implémentation Karnetik | Transposition |
|---|---|---|
| Soft delete | `is_active` flag | Jamais `DELETE`, toujours désactiver |
| Contrainte métier | Kilométrage croissant | Valider toute invariante métier en API |
| Verrouillage temporel | Entretiens locked après 48h | Commande artisan schedulée |
| Free tier | 1 véhicule max | Compter avant création, refuser si limite |
| Ownership transfer | `vehicle_transfers` avec token + expiry | Invitation par email + confirmation |
| Référentiel partagé | `garage_chains` (enseignes) | Table référentiel gérable en admin |
| Waitlist | Email → vérification → confirmed | Toujours double opt-in |
| Activity log | `activity_logs` polymorphique | Logger create/update/delete sensibles |

---

## 13. Checklist pour un nouveau projet sur cette architecture

### Phase 1 — Setup

- [ ] Créer monorepo `Projet/` avec `Api/`, `App/`, `Admin/`, `Auth/`, `Web/`
- [ ] `docker-compose.yml` MySQL + phpMyAdmin
- [ ] `Api/` : `laravel new` + Sanctum + Cashier + configurer `.env`
- [ ] 4 Next.js : `create-next-app` avec TypeScript + Tailwind v4 + `output: "export"`
- [ ] Définir sous-domaines et configurer Nginx

### Phase 2 — Auth

- [ ] Migration `users` avec champs premium/admin/locked
- [ ] `AuthController` : register, login, me, logout, updateProfile, updatePassword, deleteAccount
- [ ] Middleware `IsAdmin`
- [ ] Pages Auth : login, register, forgot-password, reset-password
- [ ] Flow redirect depuis App/Admin si pas de token

### Phase 3 — Domaine métier

- [ ] Identifier l'entité principale (équivalent `Vehicle`)
- [ ] Migrations : entité + sous-entrées + rappels
- [ ] Controllers + Resources + Requests pour chaque entité
- [ ] Pages App : liste, fiche, ajout, modification
- [ ] Conventions de stockage numérique si applicable

### Phase 4 — Admin

- [ ] Dashboard KPIs
- [ ] CRUD utilisateurs (lock/unlock/delete/export)
- [ ] CRUD entités métier (audit + modération)
- [ ] Activity logs
- [ ] Service statuses (mode maintenance par service)

### Phase 5 — Monétisation

- [ ] Stripe + Laravel Cashier
- [ ] Endpoints subscription (checkout, verify, cancel, resume, billing-portal)
- [ ] Logique free vs premium dans les controllers
- [ ] Page premium dans App

### Phase 6 — Déploiement

- [ ] VPS Ubuntu + Nginx + PHP-FPM + Let's Encrypt
- [ ] `deploy.sh` adapté (une fonction par frontend + API)
- [ ] `.env.production` par application (hors git)
- [ ] Cron artisan pour commandes schedulées

---

## 14. Répertoire des fichiers clés à créer en premier

```
Api/app/Http/Middleware/IsAdmin.php
Api/app/Http/Controllers/Api/AuthController.php
Api/app/Http/Resources/UserResource.php
Api/app/Models/User.php                     ← HasApiTokens + Billable
Api/routes/api.php                          ← 3 zones : public / sanctum / admin
Api/database/migrations/...create_users_table.php

App/src/lib/api.ts                          ← wrapper fetch avec Bearer token
App/src/lib/auth.ts                         ← getToken / logout / redirectToAuth
App/src/components/Navbar.tsx
App/src/components/MobileHeader.tsx
App/src/components/BottomNav.tsx

Auth/src/app/page.tsx                       ← formulaire login
Auth/src/lib/api.ts                         ← POST /login, stocker token

Admin/src/lib/api.ts                        ← wrapper fetch admin_token
Admin/src/components/Sidebar.tsx            ← dark mode
```
