<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\SacItem;
use App\Models\SacMouvement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SacItemController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'slug'        => 'nullable|string|max:100',
            'categorie'   => 'required|in:oxygenotherapie,pansements,immobilisation,medicaments,monitoring,autre',
            'qty_current' => 'required|integer|min:0',
            'qty_max'     => 'required|integer|min:1',
            'dlc'         => 'nullable|string|max:10',
            'note'        => 'nullable|string|max:200',
        ]);

        $item = $request->user()->sacItems()->create($data);
        $item->recalculerStatus();

        return response()->json($item, 201);
    }

    public function update(Request $request, SacItem $sacItem): JsonResponse
    {
        if ($sacItem->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'categorie'   => 'sometimes|in:oxygenotherapie,pansements,immobilisation,medicaments,monitoring,autre',
            'qty_current' => 'sometimes|integer|min:0',
            'qty_max'     => 'sometimes|integer|min:1',
            'dlc'         => 'nullable|string|max:10',
            'note'        => 'nullable|string|max:200',
        ]);

        $sacItem->update($data);
        $sacItem->recalculerStatus();

        return response()->json($sacItem->fresh());
    }

    public function destroy(Request $request, SacItem $sacItem): JsonResponse
    {
        if ($sacItem->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $sacItem->update(['is_active' => false]);

        return response()->json(['message' => 'Article retiré du sac.']);
    }

    public function consume(Request $request, SacItem $sacItem): JsonResponse
    {
        if ($sacItem->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $request->validate([
            'qty'  => 'required|integer|min:1',
            'note' => 'nullable|string|max:200',
        ]);

        $qtyBefore = $sacItem->qty_current;
        $newQty    = max(0, $qtyBefore - $request->qty);

        SacMouvement::create([
            'sac_item_id' => $sacItem->id,
            'user_id'     => $request->user()->id,
            'type'        => 'consommation',
            'delta'       => -$request->qty,
            'qty_before'  => $qtyBefore,
            'qty_after'   => $newQty,
            'note'        => $request->note,
        ]);

        $sacItem->qty_current = $newQty;
        $sacItem->recalculerStatus();

        return response()->json($sacItem->fresh());
    }

    public function restock(Request $request, SacItem $sacItem): JsonResponse
    {
        if ($sacItem->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $request->validate([
            'lots'          => 'required|array|min:1',
            'lots.*.qty'    => 'required|integer|min:1',
            'lots.*.dlc'    => 'nullable|string|max:10',
            'note'          => 'nullable|string|max:200',
        ]);

        $lots      = $request->lots;
        $totalQty  = collect($lots)->sum('qty');
        $qtyBefore = $sacItem->qty_current;
        $newQty    = min($sacItem->qty_max, $qtyBefore + $totalQty);

        $sacItem->dlcs = $lots;

        SacMouvement::create([
            'sac_item_id' => $sacItem->id,
            'user_id'     => $request->user()->id,
            'type'        => 'reappro',
            'delta'       => $totalQty,
            'qty_before'  => $qtyBefore,
            'qty_after'   => $newQty,
            'note'        => $request->note,
        ]);

        $sacItem->qty_current = $newQty;
        $sacItem->recalculerStatus();

        ActivityLog::record('sac.restock', $sacItem, [
            'item_name' => $sacItem->name,
            'qty'       => $totalQty,
        ]);

        return response()->json($sacItem->fresh());
    }
}