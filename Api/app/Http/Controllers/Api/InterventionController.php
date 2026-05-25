<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Intervention;
use App\Models\SacItem;
use App\Models\SacMouvement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InterventionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()
            ->interventions()
            ->with('garde:id,date,type,heure_debut,heure_fin')
            ->actif()
            ->latest();

        if ($request->filled('categorie')) {
            $query->where('categorie', $request->categorie);
        }

        if ($request->filled('garde_id')) {
            $query->where('garde_id', $request->garde_id);
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('motif', 'like', "%{$request->search}%")
                  ->orWhere('notes', 'like', "%{$request->search}%")
                  ->orWhere('destination', 'like', "%{$request->search}%");
            });
        }

        $perPage = $request->user()->isPremium() ? 50 : 20;

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'motif'                          => 'required|string|max:100',
            'categorie'                      => 'required|in:respi,cardio,trauma,neuro,pediatrie,psychiatrie,autre',
            'patient_sexe'                   => 'nullable|in:m,f,inconnu',
            'patient_age_range'              => 'nullable|in:pedia,adult,senior,elderly',
            'adresse_depart'                 => 'nullable|string|max:200',
            'destination'                    => 'nullable|string|max:200',
            'garde_id'                       => 'nullable|exists:gardes,id',
            'heure_alerte'                   => 'nullable|date',
            'heure_depart'                   => 'nullable|date',
            'heure_arrivee'                  => 'nullable|date',
            'gestes'                         => 'nullable|array',
            'gestes.*'                       => 'string|max:50',
            'spo2'                           => 'nullable|integer|min:0|max:100',
            'fc'                             => 'nullable|integer|min:0|max:300',
            'pas'                            => 'nullable|integer|min:0|max:300',
            'pad'                            => 'nullable|integer|min:0|max:200',
            'temperature'                    => 'nullable|integer|min:300|max:450',
            'dextro'                         => 'nullable|integer|min:0|max:1000',
            'materiel_consomme'              => 'nullable|array',
            'materiel_consomme.*.sac_item_id'=> 'required_with:materiel_consomme|integer|exists:sac_items,id',
            'materiel_consomme.*.name'       => 'required_with:materiel_consomme|string|max:100',
            'materiel_consomme.*.qty_used'   => 'required_with:materiel_consomme|integer|min:1',
            'notes'                          => 'nullable|string|max:2000',
        ]);

        if (empty($data['garde_id'])) {
            $gardeActiveId = $request->user()
                ->gardes()
                ->actif()
                ->where('is_running', true)
                ->value('id');
            if ($gardeActiveId) {
                $data['garde_id'] = $gardeActiveId;
            }
        }

        if (!empty($data['materiel_consomme'])) {
            $this->deduireMateriel($request->user()->id, $data['materiel_consomme']);
        }

        $intervention = $request->user()->interventions()->create($data);

        ActivityLog::record('intervention.created', $intervention, [
            'motif'     => $intervention->motif,
            'categorie' => $intervention->categorie,
        ]);

        return response()->json($intervention, 201);
    }

    public function show(Request $request, Intervention $intervention): JsonResponse
    {
        if ($intervention->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json($intervention);
    }

    public function update(Request $request, Intervention $intervention): JsonResponse
    {
        if ($intervention->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($intervention->is_locked) {
            return response()->json(['message' => 'Cette intervention est verrouillée.'], 403);
        }

        $data = $request->validate([
            'motif'             => 'sometimes|string|max:100',
            'categorie'         => 'sometimes|in:respi,cardio,trauma,neuro,pediatrie,psychiatrie,autre',
            'patient_sexe'      => 'nullable|in:m,f,inconnu',
            'patient_age_range' => 'nullable|in:pedia,adult,senior,elderly',
            'adresse_depart'    => 'nullable|string|max:200',
            'destination'       => 'nullable|string|max:200',
            'heure_alerte'      => 'nullable|date',
            'heure_depart'      => 'nullable|date',
            'heure_arrivee'     => 'nullable|date',
            'gestes'            => 'nullable|array',
            'gestes.*'          => 'string|max:50',
            'spo2'              => 'nullable|integer|min:0|max:100',
            'fc'                => 'nullable|integer|min:0|max:300',
            'pas'               => 'nullable|integer|min:0|max:300',
            'pad'               => 'nullable|integer|min:0|max:200',
            'temperature'       => 'nullable|integer|min:300|max:450',
            'dextro'            => 'nullable|integer|min:0|max:1000',
            'notes'             => 'nullable|string|max:2000',
        ]);

        $intervention->update($data);

        return response()->json($intervention->fresh());
    }

    public function destroy(Request $request, Intervention $intervention): JsonResponse
    {
        if ($intervention->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($intervention->is_locked) {
            return response()->json(['message' => 'Cette intervention est verrouillée.'], 403);
        }

        $intervention->update(['is_active' => false]);

        return response()->json(['message' => 'Intervention supprimée.']);
    }

    private function deduireMateriel(int $userId, array $materiel): void
    {
        foreach ($materiel as $item) {
            $sacItem = SacItem::where('user_id', $userId)
                ->where('id', $item['sac_item_id'])
                ->first();

            if (!$sacItem) continue;

            $qtyBefore        = $sacItem->qty_current;
            $newQty           = max(0, $qtyBefore - (int) $item['qty_used']);
            $sacItem->qty_current = $newQty;
            $sacItem->recalculerStatus();

            SacMouvement::create([
                'sac_item_id' => $sacItem->id,
                'user_id'     => $userId,
                'type'        => 'consommation',
                'delta'       => -((int) $item['qty_used']),
                'qty_before'  => $qtyBefore,
                'qty_after'   => $newQty,
            ]);
        }
    }
}