<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Garde;
use App\Models\Intervention;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminStatsController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'utilisateurs' => [
                'total'        => User::count(),
                'premium'      => User::where('is_premium', true)->count(),
                'actifs_7j'    => User::where('last_login_at', '>=', now()->subDays(7))->count(),
                'nouveaux_30j' => User::where('created_at', '>=', now()->subDays(30))->count(),
                'bloques'      => User::where('is_locked', true)->count(),
            ],
            'interventions' => [
                'total'         => Intervention::where('is_active', true)->count(),
                'aujourd_hui'   => Intervention::where('is_active', true)
                    ->whereDate('created_at', today())->count(),
                'ce_mois'       => Intervention::where('is_active', true)
                    ->whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year)
                    ->count(),
                'par_categorie' => Intervention::where('is_active', true)
                    ->selectRaw('categorie, count(*) as total')
                    ->groupBy('categorie')
                    ->pluck('total', 'categorie'),
            ],
            'gardes' => [
                'total'   => Garde::where('is_active', true)->count(),
                'ce_mois' => Garde::where('is_active', true)
                    ->whereMonth('date', now()->month)
                    ->whereYear('date', now()->year)
                    ->count(),
            ],
        ]);
    }
}