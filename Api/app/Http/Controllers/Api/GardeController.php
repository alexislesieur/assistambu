<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Garde;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GardeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()
            ->gardes()
            ->actif()
            ->latest('date');

        if ($request->filled('mois') && $request->filled('annee')) {
            $query->whereMonth('date', $request->mois)
                  ->whereYear('date', $request->annee);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        return response()->json($query->paginate(31));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date'        => 'required|date',
            'heure_debut' => 'required|date_format:H:i',
            'heure_fin'   => 'required|date_format:H:i',
            'type'        => 'nullable|in:commercial,garde_dep',
            'binome'      => 'nullable|string|max:100',
        ]);

        $garde = $request->user()->gardes()->create($data);

        return response()->json($garde, 201);
    }

    public function show(Request $request, Garde $garde): JsonResponse
    {
        if ($garde->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json($garde->load('interventions'));
    }

    public function update(Request $request, Garde $garde): JsonResponse
    {
        if ($garde->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'date'        => 'sometimes|date',
            'heure_debut' => 'sometimes|date_format:H:i',
            'heure_fin'   => 'sometimes|date_format:H:i',
            'type'        => 'sometimes|in:jour,nuit,garde_24h,astreinte',
            'binome'      => 'nullable|string|max:100',
        ]);

        $garde->update($data);

        return response()->json($garde->fresh());
    }

    public function destroy(Request $request, Garde $garde): JsonResponse
    {
        if ($garde->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $garde->update(['is_active' => false]);

        return response()->json(['message' => 'Garde supprimée.']);
    }

    public function statsMensuel(Request $request): JsonResponse
    {
        $request->validate([
            'mois'  => 'required|integer|min:1|max:12',
            'annee' => 'required|integer|min:2020|max:2099',
        ]);

        $gardes = $request->user()
            ->gardes()
            ->actif()
            ->whereMonth('date', $request->mois)
            ->whereYear('date', $request->annee)
            ->withCount('interventions')
            ->get();

        $totalMinutes = $gardes->sum('duree_minutes');

        return response()->json([
            'mois'             => $request->mois,
            'annee'            => $request->annee,
            'nb_gardes'        => $gardes->count(),
            'total_heures'     => round($totalMinutes / 60, 1),
            'total_minutes'    => $totalMinutes,
            'nb_interventions' => $gardes->sum('interventions_count'),
            'gardes_cloturees' => $gardes->where('is_cloturee', true)->count(),
            'repartition_types'=> $gardes->groupBy('type')->map->count(),
        ]);
    }

    public function active(Request $request): JsonResponse
    {
        $garde = $request->user()
            ->gardes()
            ->actif()
            ->where('is_running', true)
            ->withCount('interventions')
            ->first();

        return response()->json($garde);
    }

    public function demarrer(Request $request, Garde $garde): JsonResponse
    {
        if ($garde->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($garde->is_cloturee) {
            return response()->json(['message' => 'Garde déjà clôturée.'], 422);
        }

        $request->user()->gardes()->where('is_running', true)->update(['is_running' => false]);

        $garde->update(['is_running' => true]);

        ActivityLog::record('garde.demarree', $garde);

        return response()->json($garde->fresh());
    }

    public function cloturer(Request $request, Garde $garde): JsonResponse
    {
        if ($garde->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($garde->is_cloturee) {
            return response()->json(['message' => 'Cette garde est déjà clôturée.'], 422);
        }

        $request->validate([
            'notes_recap'      => 'nullable|string|max:2000',
            'heure_fin_reelle' => 'nullable|date_format:H:i',
            'pauses'           => 'nullable|array',
            'pauses.*.debut'   => 'required_with:pauses|date_format:H:i',
            'pauses.*.fin'     => 'required_with:pauses|date_format:H:i',
        ]);

        $interventions = $garde->interventions()
            ->actif()
            ->get(['id', 'motif', 'categorie', 'destination', 'created_at']);

        $materielSorti = $garde->interventions()
            ->actif()
            ->whereNotNull('materiel_consomme')
            ->pluck('materiel_consomme')
            ->flatten(1)
            ->groupBy('sac_item_id')
            ->map(fn($items) => [
                'name'      => $items->first()['name'] ?? '—',
                'qty_total' => $items->sum('qty_used'),
            ])
            ->values();

        $updateData = [
            'is_cloturee' => true,
            'is_running'  => false,
            'cloturee_at' => now(),
            'notes_recap' => $request->notes_recap,
            'pauses'      => $request->pauses ?? [],
        ];

        if ($request->filled('heure_fin_reelle')) {
            $updateData['heure_fin'] = $request->heure_fin_reelle;
        }

        $garde->update($updateData);

        ActivityLog::record('garde.cloturee', $garde, [
            'nb_interventions' => $interventions->count(),
        ]);

        return response()->json([
            'garde'  => $garde->fresh(),
            'recap'  => [
                'nb_interventions' => $interventions->count(),
                'interventions'    => $interventions,
                'materiel_sorti'   => $materielSorti,
                'duree_heures'     => round($garde->duree_minutes / 60, 1),
            ],
        ]);
    }
}