<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conge;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CongeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()->conges()->actif()->orderBy('date_debut');

        if ($request->filled('mois') && $request->filled('annee')) {
            $query->where(function ($q) use ($request) {
                $q->whereMonth('date_debut', $request->mois)->whereYear('date_debut', $request->annee)
                  ->orWhere(function ($q2) use ($request) {
                      $q2->whereMonth('date_fin', $request->mois)->whereYear('date_fin', $request->annee);
                  });
            });
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date_debut' => 'required|date',
            'date_fin'   => 'required|date|after_or_equal:date_debut',
            'type'       => 'nullable|in:conge,maladie,formation',
            'notes'      => 'nullable|string|max:500',
        ]);

        $conge = $request->user()->conges()->create($data);

        return response()->json($conge, 201);
    }

    public function update(Request $request, Conge $conge): JsonResponse
    {
        if ($conge->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'date_debut' => 'sometimes|date',
            'date_fin'   => 'sometimes|date|after_or_equal:date_debut',
            'type'       => 'sometimes|in:conge,maladie,formation',
            'notes'      => 'nullable|string|max:500',
        ]);

        $conge->update($data);

        return response()->json($conge->fresh());
    }

    public function destroy(Request $request, Conge $conge): JsonResponse
    {
        if ($conge->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $conge->update(['is_active' => false]);

        return response()->json(['message' => 'Congé supprimé.']);
    }
}
