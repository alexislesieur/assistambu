<?php

namespace Database\Seeders;

use App\Models\Hopital;
use App\Models\Protocole;
use App\Models\SacItem;
use App\Models\ServiceStatus;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Admin ──────────────────────────────────────────────
        User::firstOrCreate(['email' => 'admin@assistambu.fr'], [
            'first_name' => 'Admin',
            'last_name'  => 'AssistAmbu',
            'password'   => Hash::make('password'),
            'statut'     => 'ade',
            'is_admin'   => true,
            'is_premium' => true,
        ]);

        // ── Utilisateur de test ────────────────────────────────
        $user = User::firstOrCreate(['email' => 'test@assistambu.fr'], [
            'first_name' => 'Marc',
            'last_name'  => 'Ambulancier',
            'password'   => Hash::make('password'),
            'statut'     => 'ade',
        ]);

        // ── Sac par défaut ─────────────────────────────────────
        $sacItems = [
            ['name' => 'Masque HC adulte',          'slug' => 'masque_hc_ad',  'categorie' => 'oxygenotherapie', 'qty_current' => 3,  'qty_max' => 5,  'dlc' => '12/2026'],
            ['name' => 'Masque HC pédiatrique',     'slug' => 'masque_hc_pe',  'categorie' => 'oxygenotherapie', 'qty_current' => 2,  'qty_max' => 3,  'dlc' => '08/2026'],
            ['name' => 'Lunettes O2',               'slug' => 'lunettes_o2',   'categorie' => 'oxygenotherapie', 'qty_current' => 5,  'qty_max' => 8,  'dlc' => '03/2027'],
            ['name' => 'Canule de Guedel (x4)',     'slug' => 'canule_guedel', 'categorie' => 'oxygenotherapie', 'qty_current' => 4,  'qty_max' => 4,  'dlc' => null],
            ['name' => 'Bouteille O2 2L',           'slug' => 'bouteille_o2',  'categorie' => 'oxygenotherapie', 'qty_current' => 1,  'qty_max' => 2,  'dlc' => null,      'note' => 'Pression: 140 bar'],
            ['name' => 'Compresses stériles 10×10', 'slug' => 'compresses',    'categorie' => 'pansements',      'qty_current' => 2,  'qty_max' => 10, 'dlc' => '06/2026'],
            ['name' => 'Pansement hémostatique',    'slug' => 'pans_hemo',     'categorie' => 'pansements',      'qty_current' => 0,  'qty_max' => 3,  'dlc' => null],
            ['name' => 'Bandes élastiques',         'slug' => 'bandes_elast',  'categorie' => 'pansements',      'qty_current' => 6,  'qty_max' => 8,  'dlc' => '09/2027'],
            ['name' => 'Sérum physiologique 250ml', 'slug' => 'serum_physio',  'categorie' => 'pansements',      'qty_current' => 4,  'qty_max' => 6,  'dlc' => '05/2026'],
            ['name' => 'Minerve adulte',             'slug' => 'minerve_ad',   'categorie' => 'immobilisation',  'qty_current' => 2,  'qty_max' => 2,  'dlc' => null],
            ['name' => 'Attelle jambe',              'slug' => 'attelle_jambe','categorie' => 'immobilisation',  'qty_current' => 1,  'qty_max' => 2,  'dlc' => null],
            ['name' => 'Paracétamol 500mg',          'slug' => 'paracetamol',  'categorie' => 'medicaments',     'qty_current' => 8,  'qty_max' => 10, 'dlc' => '11/2026'],
            ['name' => 'Aspirine 500mg',             'slug' => 'aspirine',     'categorie' => 'medicaments',     'qty_current' => 4,  'qty_max' => 6,  'dlc' => '02/2027'],
            ['name' => 'Gants nitrile M',            'slug' => 'gants_nitrile','categorie' => 'medicaments',     'qty_current' => 18, 'qty_max' => 50, 'dlc' => '07/2027'],
            ['name' => 'Masques FFP2',               'slug' => 'masques_ffp2', 'categorie' => 'medicaments',     'qty_current' => 0,  'qty_max' => 10, 'dlc' => null],
        ];

        foreach ($sacItems as $itemData) {
            $item = SacItem::firstOrCreate(
                ['user_id' => $user->id, 'slug' => $itemData['slug']],
                array_merge($itemData, ['user_id' => $user->id])
            );
            $item->recalculerStatus();
        }

        // ── Hôpitaux ───────────────────────────────────────────
        $hopitaux = [
            ['name' => 'CHU Lille - Urgences adultes',    'ville' => 'Lille',          'departement' => '59', 'telephone' => '03 20 44 44 44'],
            ['name' => 'CH Roubaix - SAU',                'ville' => 'Roubaix',        'departement' => '59', 'telephone' => '03 20 99 31 31'],
            ['name' => 'CH Valenciennes',                  'ville' => 'Valenciennes',   'departement' => '59'],
            ['name' => 'Hôpital Lariboisière - Urgences', 'ville' => 'Paris',          'departement' => '75', 'telephone' => '01 49 95 65 65'],
            ['name' => 'Hôtel-Dieu - SAU',                'ville' => 'Paris',          'departement' => '75'],
            ['name' => 'CHU Bordeaux - Pellegrin',        'ville' => 'Bordeaux',       'departement' => '33'],
            ['name' => 'CHU Montpellier - Lapeyronie',    'ville' => 'Montpellier',    'departement' => '34'],
        ];

        foreach ($hopitaux as $h) {
            Hopital::firstOrCreate(['name' => $h['name']], $h);
        }

        // ── Protocoles ─────────────────────────────────────────
        $protocoles = [
            [
                'slug'      => 'bilan-primaire',
                'titre'     => 'Bilan primaire ABCDE',
                'categorie' => 'bilan',
                'contenu'   => "# Bilan primaire ABCDE\n\n**A — Airway** : Libération des voies aériennes\n\n**B — Breathing** : Ventilation / Respiration\n\n**C — Circulation** : Pouls, saignements, SpO2\n\n**D — Disability** : Score de Glasgow\n\n**E — Exposure** : Exposition / Environnement",
                'tags'      => ['bilan', 'urgence'],
                'is_premium'=> false,
                'ordre'     => 1,
            ],
            [
                'slug'      => 'detresse-respiratoire',
                'titre'     => 'Détresse respiratoire',
                'categorie' => 'pathologies',
                'contenu'   => "# Détresse respiratoire\n\n## Signes\n- FR > 25/min ou < 10/min\n- SpO2 < 94%\n- Tirage, balancement thoraco-abdominal\n\n## Conduite à tenir\n1. Position demi-assise\n2. O2 au masque haute concentration\n3. Scope + SpO2\n4. Bilan SAMU",
                'tags'      => ['respi', 'urgence'],
                'is_premium'=> false,
                'ordre'     => 1,
            ],
            [
                'slug'      => 'acr',
                'titre'     => 'Arrêt cardio-respiratoire',
                'categorie' => 'gestes',
                'contenu'   => "# ACR — Arrêt Cardio-Respiratoire\n\n## Reconnaissance\n- Inconscience\n- Absence de ventilation normale\n\n## RCP de base\n1. Appel SAMU 15\n2. MCE 30 compressions / 2 insufflations\n3. Fréquence : 100-120/min\n4. DEA dès disponible",
                'tags'      => ['cardio', 'urgence', 'geste'],
                'is_premium'=> false,
                'ordre'     => 1,
            ],
        ];

        foreach ($protocoles as $p) {
            Protocole::firstOrCreate(['slug' => $p['slug']], $p);
        }

        // ── Statuts des services ───────────────────────────────
        foreach (['app', 'api', 'admin'] as $service) {
            ServiceStatus::firstOrCreate(
                ['service' => $service],
                ['is_maintenance' => false]
            );
        }

        $this->command->info('✅ Base de données initialisée.');
        $this->command->line('   admin@assistambu.fr / password');
        $this->command->line('   test@assistambu.fr  / password');
    }
}