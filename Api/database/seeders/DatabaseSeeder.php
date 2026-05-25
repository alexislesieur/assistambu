<?php

namespace Database\Seeders;

use App\Models\Article;
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
        User::firstOrCreate(['email' => 'admin@assist-ambu.fr'], [
            'first_name' => 'Admin',
            'last_name'  => 'AssistAmbu',
            'password'   => Hash::make('password'),
            'is_admin'   => true,
            'is_premium' => true,
        ]);

        // ── Utilisateur de test ────────────────────────────────
        $user = User::firstOrCreate(['email' => 'test@assist-ambu.fr'], [
            'first_name' => 'Marc',
            'last_name'  => 'Ambulancier',
            'password'   => Hash::make('password'),
        ]);

        // ── Catalogue articles ─────────────────────────────────
        $articles = [
            // Oxygénothérapie
            ['name' => 'Masque HC adulte',          'categorie' => 'oxygenotherapie'],
            ['name' => 'Masque HC pédiatrique',     'categorie' => 'oxygenotherapie'],
            ['name' => 'Lunettes O2',               'categorie' => 'oxygenotherapie'],
            ['name' => 'Canule de Guedel',          'categorie' => 'oxygenotherapie'],
            ['name' => 'Bouteille O2 2L',           'categorie' => 'oxygenotherapie'],
            ['name' => 'Ballon insufflateur (BAVU)', 'categorie' => 'oxygenotherapie'],
            // Pansements
            ['name' => 'Compresses stériles 10×10', 'categorie' => 'pansements'],
            ['name' => 'Pansement hémostatique',    'categorie' => 'pansements'],
            ['name' => 'Bandes élastiques',         'categorie' => 'pansements'],
            ['name' => 'Sérum physiologique 250ml', 'categorie' => 'pansements'],
            ['name' => 'Sparadrap',                 'categorie' => 'pansements'],
            ['name' => 'Pansement américain',       'categorie' => 'pansements'],
            // Immobilisation
            ['name' => 'Minerve adulte',            'categorie' => 'immobilisation'],
            ['name' => 'Minerve pédiatrique',       'categorie' => 'immobilisation'],
            ['name' => 'Attelle jambe',             'categorie' => 'immobilisation'],
            ['name' => 'Attelle bras',              'categorie' => 'immobilisation'],
            ['name' => 'Matelas immobilisateur',    'categorie' => 'immobilisation'],
            // Médicaments
            ['name' => 'Paracétamol 500mg',         'categorie' => 'medicaments'],
            ['name' => 'Aspirine 500mg',            'categorie' => 'medicaments'],
            ['name' => 'Naloxone 0.4mg',            'categorie' => 'medicaments'],
            ['name' => 'Glucose 30%',               'categorie' => 'medicaments'],
            ['name' => 'Adrénaline 1mg',            'categorie' => 'medicaments'],
            // Monitoring
            ['name' => 'Électrodes ECG',            'categorie' => 'monitoring'],
            ['name' => 'Capteur SpO2',              'categorie' => 'monitoring'],
            ['name' => 'Tensiomètre',               'categorie' => 'monitoring'],
            ['name' => 'Glucomètre',                'categorie' => 'monitoring'],
            ['name' => 'Thermomètre',               'categorie' => 'monitoring'],
            // Autre
            ['name' => 'Gants nitrile M',           'categorie' => 'autre'],
            ['name' => 'Gants nitrile L',           'categorie' => 'autre'],
            ['name' => 'Masques chirurgicaux',      'categorie' => 'autre'],
            ['name' => 'Masques FFP2',              'categorie' => 'autre'],
            ['name' => 'Couverture de survie',      'categorie' => 'autre'],
            ['name' => 'Ciseaux trauma',            'categorie' => 'autre'],
        ];

        foreach ($articles as $a) {
            Article::firstOrCreate(['name' => $a['name']], $a);
        }

        // ── Sac de test ────────────────────────────────────────
        SacItem::where('user_id', $user->id)->delete();

        $sacItems = [
            ['name' => 'Bande Velpeau 5cm',                'categorie' => 'pansements',      'qty_current' => 1, 'qty_max' => 1, 'dlc' => '31/01/2028', 'emplacement' => null],
            ['name' => 'Bande Velpeau 10cm',               'categorie' => 'pansements',      'qty_current' => 1, 'qty_max' => 1, 'dlc' => '31/01/2030', 'emplacement' => null],
            ['name' => 'Compresse de gaze (pochette de 2)','categorie' => 'pansements',      'qty_current' => 1, 'qty_max' => 1, 'dlc' => '01/08/2026', 'emplacement' => null],
            ['name' => 'Pansement stérile 20x40',          'categorie' => 'pansements',      'qty_current' => 2, 'qty_max' => 2, 'dlc' => '31/01/2028', 'emplacement' => null],
            ['name' => 'Rouleau de sparadrap',             'categorie' => 'pansements',      'qty_current' => 2, 'qty_max' => 2, 'dlc' => null,         'emplacement' => null],
            ['name' => 'Paires de gants stériles',         'categorie' => 'autre',           'qty_current' => 2, 'qty_max' => 2, 'dlc' => '31/01/2029', 'emplacement' => null],
            ['name' => 'Gel hydroalcoolique 100mL',        'categorie' => 'autre',           'qty_current' => 1, 'qty_max' => 1, 'dlc' => '31/01/2027', 'emplacement' => null],
            ['name' => 'Unidose de Septimyl',              'categorie' => 'medicaments',     'qty_current' => 1, 'qty_max' => 1, 'dlc' => '31/08/2028', 'emplacement' => null],
            ['name' => 'Canule Oropharyngée S',            'categorie' => 'oxygenotherapie', 'qty_current' => 1, 'qty_max' => 1, 'dlc' => '30/04/2029', 'emplacement' => null],
            ['name' => 'Canule Oropharyngée M',            'categorie' => 'oxygenotherapie', 'qty_current' => 1, 'qty_max' => 1, 'dlc' => '31/07/2028', 'emplacement' => null],
            ['name' => 'Canule Oropharyngée L',            'categorie' => 'oxygenotherapie', 'qty_current' => 1, 'qty_max' => 1, 'dlc' => '31/07/2029', 'emplacement' => null],
        ];

        foreach ($sacItems as $itemData) {
            $item = SacItem::create(array_merge($itemData, ['user_id' => $user->id]));
            $item->recalculerStatus();
        }

        // ── Hôpitaux ───────────────────────────────────────────
        $hopitaux = [
            ['name' => 'CHU Lille - Urgences adultes',    'ville' => 'Lille',        'departement' => '59', 'telephone' => '03 20 44 44 44'],
            ['name' => 'CH Roubaix - SAU',                'ville' => 'Roubaix',      'departement' => '59', 'telephone' => '03 20 99 31 31'],
            ['name' => 'CH Valenciennes',                  'ville' => 'Valenciennes', 'departement' => '59'],
            ['name' => 'Hôpital Lariboisière - Urgences', 'ville' => 'Paris',        'departement' => '75', 'telephone' => '01 49 95 65 65'],
            ['name' => 'Hôtel-Dieu - SAU',                'ville' => 'Paris',        'departement' => '75'],
            ['name' => 'CHU Bordeaux - Pellegrin',        'ville' => 'Bordeaux',     'departement' => '33'],
            ['name' => 'CHU Montpellier - Lapeyronie',    'ville' => 'Montpellier',  'departement' => '34'],
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
        $this->command->line('   admin@assist-ambu.fr / password');
        $this->command->line('   test@assist-ambu.fr  / password');
    }
}
