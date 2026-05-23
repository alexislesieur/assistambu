<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\SacItem;
use App\Models\SacMouvement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SacController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = $request->user()
            ->sacItems()
            ->actif()
            ->orderBy('categorie')
            ->orderBy('name')
            ->get();

        $grouped = $items->groupBy('categorie')->map(function ($catItems) {
            return [
                'items'     => $catItems->values(),
                'total'     => $catItems->count(),
                'conformes' => $catItems->where('status', 'ok')->count(),
                'alertes'   => $catItems->where('status', 'warning')->count(),
                'epuises'   => $catItems->where('status', 'danger')->count(),
            ];
        });

        return response()->json([
            'categories' => $grouped,
            'stats'      => [
                'total_items'      => $items->count(),
                'conformes'        => $items->where('status', 'ok')->count(),
                'alertes'          => $items->where('status', 'warning')->count(),
                'epuises'          => $items->where('status', 'danger')->count(),
                'taux_conformite'  => $items->count() > 0
                    ? round(($items->where('status', 'ok')->count() / $items->count()) * 100)
                    : 0,
            ],
        ]);
    }

    public function check(Request $request): JsonResponse
    {
        $request->user()->sacItems()->actif()->get()->each->recalculerStatus();

        ActivityLog::record('sac.checked');

        return response()->json(['message' => 'Vérification enregistrée.', 'checked_at' => now()]);
    }

    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();

        $alertes = $user->sacItems()->actif()->alertes()->get();

        $mouvementsRecents = SacMouvement::where('user_id', $user->id)
            ->with('item:id,name')
            ->latest('created_at')
            ->take(10)
            ->get();

        return response()->json([
            'alertes'            => $alertes,
            'mouvements_recents' => $mouvementsRecents,
        ]);
    }
}