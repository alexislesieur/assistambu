<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Garde;
use App\Models\GardeRecurrence;
use Carbon\Carbon;
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

    public function storeRecurrence(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date_debut'      => 'required|date',
            'date_fin'        => 'nullable|date|after_or_equal:date_debut',
            'frequence'       => 'required|in:quotidien,hebdomadaire,bihebdomadaire,mensuel',
            'jours_semaine'   => 'nullable|array',
            'jours_semaine.*' => 'integer|min:1|max:7',
            'heure_debut'     => 'required|date_format:H:i',
            'heure_fin'       => 'required|date_format:H:i',
            'type'            => 'nullable|in:commercial,garde_dep',
            'binome'          => 'nullable|string|max:100',
        ]);

        if (in_array($data['frequence'], ['hebdomadaire', 'bihebdomadaire']) && empty($data['jours_semaine'])) {
            return response()->json(['message' => 'Les jours de la semaine sont requis pour cette fréquence.'], 422);
        }

        $recurrence = $request->user()->recurrences()->create([
            'frequence'     => $data['frequence'],
            'jours_semaine' => $data['jours_semaine'] ?? null,
            'date_debut'    => $data['date_debut'],
            'date_fin'      => $data['date_fin'] ?? null,
            'heure_debut'   => $data['heure_debut'],
            'heure_fin'     => $data['heure_fin'],
            'type'          => $data['type'] ?? 'commercial',
            'binome'        => $data['binome'] ?? null,
        ]);

        $this->genererGardes($recurrence, $data['date_debut'], $data['date_fin'] ?? null, $request->user());

        $count = $request->user()->gardes()->where('recurrence_id', $recurrence->id)->count();

        return response()->json(['recurrence' => $recurrence, 'created' => $count], 201);
    }

    private function genererGardes(GardeRecurrence $rec, string $dateFrom, ?string $dateTo, \App\Models\User $user): void
    {
        $current    = Carbon::parse($dateFrom);
        $end        = $dateTo ? Carbon::parse($dateTo) : Carbon::parse($dateFrom)->addYear();
        $anchorWeek = Carbon::parse($rec->date_debut)->startOfWeek(Carbon::MONDAY);

        while ($current->lte($end)) {
            $dow         = (int) $current->isoFormat('E');
            $weekStart   = $current->copy()->startOfWeek(Carbon::MONDAY);
            $weekDiff    = (int) $anchorWeek->diffInWeeks($weekStart);
            $jours       = $rec->jours_semaine ?? [];

            $shouldCreate = match ($rec->frequence) {
                'quotidien'      => true,
                'hebdomadaire'   => in_array($dow, $jours),
                'bihebdomadaire' => in_array($dow, $jours) && $weekDiff % 2 === 0,
                'mensuel'        => $current->day === Carbon::parse($rec->date_debut)->day,
                default          => false,
            };

            if ($shouldCreate) {
                $user->gardes()->create([
                    'date'          => $current->toDateString(),
                    'heure_debut'   => $rec->heure_debut,
                    'heure_fin'     => $rec->heure_fin,
                    'type'          => $rec->type,
                    'binome'        => $rec->binome,
                    'recurrence_id' => $rec->id,
                ]);
            }

            $current->addDay();
        }
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
            'scope'       => 'nullable|in:occurrence,following,all',
            'date'        => 'sometimes|date',
            'heure_debut' => 'sometimes|date_format:H:i',
            'heure_fin'   => 'sometimes|date_format:H:i',
            'type'        => 'sometimes|in:commercial,garde_dep',
            'binome'      => 'nullable|string|max:100',
        ]);

        $scope = $data['scope'] ?? 'occurrence';
        unset($data['scope']);

        // Non-recurring or occurrence: update this garde only
        if (!$garde->recurrence_id || $scope === 'occurrence') {
            if ($garde->recurrence_id) {
                $data['recurrence_id'] = null; // detach from series
            }
            $garde->update($data);
            return response()->json($garde->fresh());
        }

        $recurrence = GardeRecurrence::find($garde->recurrence_id);
        if (!$recurrence) {
            $garde->update($data);
            return response()->json($garde->fresh());
        }

        $gardeDate  = $garde->date instanceof Carbon ? $garde->date->toDateString() : (string) $garde->date;
        $recDebut   = $recurrence->date_debut instanceof Carbon ? $recurrence->date_debut->toDateString() : (string) $recurrence->date_debut;
        $recFin     = $recurrence->date_fin
            ? ($recurrence->date_fin instanceof Carbon ? $recurrence->date_fin->toDateString() : (string) $recurrence->date_fin)
            : null;

        // Only time/type/binome propagate to the series (not date)
        $fields = [];
        if (isset($data['heure_debut'])) $fields['heure_debut'] = $data['heure_debut'];
        if (isset($data['heure_fin']))   $fields['heure_fin']   = $data['heure_fin'];
        if (isset($data['type']))        $fields['type']        = $data['type'];
        if (array_key_exists('binome', $data)) $fields['binome'] = $data['binome'];

        if ($scope === 'following') {
            $dayBefore = Carbon::parse($gardeDate)->subDay()->toDateString();

            // Delete this garde and all future ones in this recurrence
            $request->user()->gardes()
                ->where('recurrence_id', $recurrence->id)
                ->where('is_active', true)
                ->where('date', '>=', $gardeDate)
                ->update(['is_active' => false]);

            if ($dayBefore < $recDebut) {
                // Editing from the very first → update recurrence and regenerate all
                if (!empty($fields)) $recurrence->update($fields);
                $this->genererGardes($recurrence->fresh(), $recDebut, $recFin, $request->user());
            } else {
                // Truncate old recurrence; create a new one from this date
                $recurrence->update(['date_fin' => $dayBefore]);

                $newRec = $request->user()->recurrences()->create([
                    'frequence'     => $recurrence->frequence,
                    'jours_semaine' => $recurrence->jours_semaine,
                    'date_debut'    => $gardeDate,
                    'date_fin'      => $recFin,
                    'heure_debut'   => $fields['heure_debut'] ?? $recurrence->heure_debut,
                    'heure_fin'     => $fields['heure_fin']   ?? $recurrence->heure_fin,
                    'type'          => $fields['type']        ?? $recurrence->type,
                    'binome'        => array_key_exists('binome', $fields) ? $fields['binome'] : $recurrence->binome,
                ]);

                $this->genererGardes($newRec, $gardeDate, $recFin, $request->user());
            }
        } elseif ($scope === 'all') {
            if (!empty($fields)) {
                $recurrence->update($fields);
                $request->user()->gardes()
                    ->where('recurrence_id', $recurrence->id)
                    ->where('is_active', true)
                    ->update($fields);
            }
        }

        return response()->json(['message' => 'Récurrence mise à jour.']);
    }

    public function destroy(Request $request, Garde $garde): JsonResponse
    {
        if ($garde->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $scope = $request->query('scope', 'occurrence');

        if (!$garde->recurrence_id || $scope === 'occurrence') {
            $garde->update(['is_active' => false]);
            return response()->json(['message' => 'Garde supprimée.']);
        }

        $recurrence = GardeRecurrence::find($garde->recurrence_id);
        $gardeDate  = $garde->date instanceof Carbon ? $garde->date->toDateString() : (string) $garde->date;

        if ($scope === 'following') {
            $request->user()->gardes()
                ->where('recurrence_id', $garde->recurrence_id)
                ->where('is_active', true)
                ->where('date', '>=', $gardeDate)
                ->update(['is_active' => false]);

            if ($recurrence) {
                $dayBefore = Carbon::parse($gardeDate)->subDay()->toDateString();
                $recDebut  = $recurrence->date_debut instanceof Carbon
                    ? $recurrence->date_debut->toDateString()
                    : (string) $recurrence->date_debut;

                if ($dayBefore < $recDebut) {
                    $recurrence->update(['is_active' => false]);
                } else {
                    $recurrence->update(['date_fin' => $dayBefore]);
                }
            }
        } elseif ($scope === 'all') {
            $request->user()->gardes()
                ->where('recurrence_id', $garde->recurrence_id)
                ->update(['is_active' => false]);

            if ($recurrence) {
                $recurrence->update(['is_active' => false]);
            }
        }

        return response()->json(['message' => 'Garde(s) supprimée(s).']);
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
            'mois'              => $request->mois,
            'annee'             => $request->annee,
            'nb_gardes'         => $gardes->count(),
            'total_heures'      => round($totalMinutes / 60, 1),
            'total_minutes'     => $totalMinutes,
            'nb_interventions'  => $gardes->sum('interventions_count'),
            'gardes_cloturees'  => $gardes->where('is_cloturee', true)->count(),
            'repartition_types' => $gardes->groupBy('type')->map->count(),
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
            'garde' => $garde->fresh(),
            'recap' => [
                'nb_interventions' => $interventions->count(),
                'interventions'    => $interventions,
                'materiel_sorti'   => $materielSorti,
                'duree_heures'     => round($garde->duree_minutes / 60, 1),
            ],
        ]);
    }
}
