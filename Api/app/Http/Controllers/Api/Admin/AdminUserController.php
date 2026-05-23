<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::withTrashed()
            ->withCount(['interventions', 'gardes'])
            ->latest();

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('email', 'like', "%{$request->search}%")
                  ->orWhere('first_name', 'like', "%{$request->search}%")
                  ->orWhere('last_name', 'like', "%{$request->search}%");
            });
        }

        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }

        if ($request->boolean('locked')) {
            $query->where('is_locked', true);
        }

        if ($request->boolean('premium')) {
            $query->where('is_premium', true);
        }

        return response()->json($query->paginate(25));
    }

    public function show(User $user): JsonResponse
    {
        $user->loadCount(['interventions', 'gardes']);

        return response()->json($user);
    }

    public function lock(Request $request, User $user): JsonResponse
    {
        $request->validate(['reason' => 'nullable|string|max:200']);

        $user->update([
            'is_locked'   => true,
            'lock_reason' => $request->reason,
        ]);

        $user->tokens()->delete();

        ActivityLog::record('admin.user_locked', $user, [
            'admin_id' => $request->user()->id,
            'reason'   => $request->reason,
        ]);

        return response()->json(['message' => "Compte de {$user->first_name} suspendu."]);
    }

    public function unlock(Request $request, User $user): JsonResponse
    {
        $user->update(['is_locked' => false, 'lock_reason' => null]);

        ActivityLog::record('admin.user_unlocked', $user, [
            'admin_id' => $request->user()->id,
        ]);

        return response()->json(['message' => "Compte de {$user->first_name} réactivé."]);
    }

    public function setPremium(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'is_premium'         => 'required|boolean',
            'premium_expires_at' => 'nullable|date',
        ]);

        $user->update($request->only('is_premium', 'premium_expires_at'));

        ActivityLog::record('admin.user_premium_set', $user, [
            'admin_id'   => $request->user()->id,
            'is_premium' => $request->is_premium,
        ]);

        return response()->json($user->fresh());
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Impossible de supprimer votre propre compte.'], 422);
        }

        ActivityLog::record('admin.user_deleted', $user, [
            'admin_id' => $request->user()->id,
            'email'    => $user->email,
        ]);

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }

    public function export(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="users_' . now()->format('Y-m-d') . '.csv"',
        ];

        $users = User::withCount(['interventions', 'gardes'])->get();

        return response()->stream(function () use ($users) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Prénom', 'Nom', 'Email', 'Statut', 'Premium', 'Interventions', 'Gardes', 'Inscrit le']);
            foreach ($users as $u) {
                fputcsv($handle, [
                    $u->id, $u->first_name, $u->last_name, $u->email,
                    $u->statut, $u->isPremium() ? 'Oui' : 'Non',
                    $u->interventions_count, $u->gardes_count,
                    $u->created_at->format('d/m/Y'),
                ]);
            }
            fclose($handle);
        }, 200, $headers);
    }
}