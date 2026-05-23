<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ServiceStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminServiceController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(ServiceStatus::all());
    }

    public function setMaintenance(Request $request, string $service): JsonResponse
    {
        $request->validate([
            'is_maintenance' => 'required|boolean',
            'message'        => 'nullable|string|max:300',
        ]);

        $status = ServiceStatus::updateOrCreate(
            ['service' => $service],
            $request->only('is_maintenance', 'message')
        );

        return response()->json($status);
    }
}