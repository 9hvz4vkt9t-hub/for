"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import {
  GraduationCap,
  UserPlus,
  BookOpen,
  Users,
  ClipboardCheck,
  Award,
  Wallet,
  AlertCircle,
  CalendarDays,
  FileText,
  TrendingUp,
} from "lucide-react";

interface DashboardStats {
  totalStudents: number;
  newApplicants: number;
  reviewingApplicants: number;
  admittedApplicants: number;
  activeStudents: number;
  activeEnrollments: number;
  totalEnrollments: number;
}

export default function DashboardPage() {
  const { profile, roles, permissions } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const displayName =
    profile && (profile.first_name || profile.last_name)
      ? `${profile.first_name} ${profile.last_name}`.trim()
      : "Utilisateur";

  const primaryRole = roles[0]?.replace(/_/g, " ") ?? "utilisateur";

  useEffect(() => {
    async function fetchStats() {
      if (!profile?.institution_id) {
        setLoadingStats(false);
        return;
      }

      try {
        const canViewStudents = permissions.includes("students.view" as never);
        const canViewApplicants = permissions.includes("applicants.view" as never);
        const canViewEnrollments = permissions.includes("enrollments.view" as never);

        if (!canViewStudents && !canViewApplicants && !canViewEnrollments) {
          setLoadingStats(false);
          return;
        }

        const statsMap: Record<string, number> = {};

        if (canViewStudents) {
          const [totalRes, activeRes] = await Promise.all([
            supabase
              .from("students")
              .select("*", { count: "exact", head: true })
              .eq("institution_id", profile.institution_id),
            supabase
              .from("students")
              .select("*", { count: "exact", head: true })
              .eq("institution_id", profile.institution_id)
              .eq("status", "active"),
          ]);
          statsMap.totalStudents = totalRes.count ?? 0;
          statsMap.activeStudents = activeRes.count ?? 0;
        }

        if (canViewApplicants) {
          const [newRes, reviewingRes, admittedRes] = await Promise.all([
            supabase
              .from("applicants")
              .select("*", { count: "exact", head: true })
              .eq("institution_id", profile.institution_id)
              .eq("status", "new"),
            supabase
              .from("applicants")
              .select("*", { count: "exact", head: true })
              .eq("institution_id", profile.institution_id)
              .eq("status", "reviewing"),
            supabase
              .from("applicants")
              .select("*", { count: "exact", head: true })
              .eq("institution_id", profile.institution_id)
              .eq("status", "admitted"),
          ]);
          statsMap.newApplicants = newRes.count ?? 0;
          statsMap.reviewingApplicants = reviewingRes.count ?? 0;
          statsMap.admittedApplicants = admittedRes.count ?? 0;
        }

        if (canViewEnrollments) {
          const studentIds = (await supabase.from("students").select("id").eq("institution_id", profile.institution_id)).data?.map((r: { id: string }) => r.id) ?? [];
          if (studentIds.length > 0) {
            const [totalEnrRes, activeEnrRes] = await Promise.all([
              supabase.from("enrollments").select("*", { count: "exact", head: true }).in("student_id", studentIds),
              supabase.from("enrollments").select("*", { count: "exact", head: true }).in("student_id", studentIds).eq("status", "active"),
            ]);
            statsMap.totalEnrollments = totalEnrRes.count ?? 0;
            statsMap.activeEnrollments = activeEnrRes.count ?? 0;
          }
        }

        setStats({
          totalStudents: statsMap.totalStudents ?? 0,
          activeStudents: statsMap.activeStudents ?? 0,
          newApplicants: statsMap.newApplicants ?? 0,
          reviewingApplicants: statsMap.reviewingApplicants ?? 0,
          admittedApplicants: statsMap.admittedApplicants ?? 0,
          activeEnrollments: statsMap.activeEnrollments ?? 0,
          totalEnrollments: statsMap.totalEnrollments ?? 0,
        });
      } catch {
        setStats(null);
      } finally {
        setLoadingStats(false);
      }
    }

    fetchStats();
  }, [profile?.institution_id, permissions]);

  return (
    <div>
      <PageHeader
        title={`Bonjour, ${displayName}`}
        description={`Vous êtes connecté en tant que ${primaryRole}.`}
      />

      {roles.includes("direction") || roles.includes("super_admin") ? (
        <DirectionDashboard stats={stats} loading={loadingStats} />
      ) : roles.includes("administration") || roles.includes("scolarite") ? (
        <AdminScolariteDashboard stats={stats} loading={loadingStats} />
      ) : roles.includes("comptabilite") ? (
        <ComptabiliteDashboard />
      ) : roles.includes("formateur") ? (
        <FormateurDashboard />
      ) : roles.includes("etudiant") ? (
        <EtudiantDashboard />
      ) : (
        <Card className="p-6">
          <EmptyState
            title="Aucun tableau de bord disponible"
            message="Votre compte n'a pas de rôle attribué. Contactez un administrateur."
          />
        </Card>
      )}
    </div>
  );
}

function DirectionDashboard({ stats, loading }: { stats: DashboardStats | null; loading: boolean }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total étudiants" value={loading ? "…" : stats?.totalStudents ?? 0} icon={GraduationCap} />
        <StatCard label="Étudiants actifs" value={loading ? "…" : stats?.activeStudents ?? 0} icon={Users} />
        <StatCard label="Nouvelles candidatures" value={loading ? "…" : stats?.newApplicants ?? 0} icon={UserPlus} />
        <StatCard label="Candidatures acceptées" value={loading ? "…" : stats?.admittedApplicants ?? 0} icon={UserPlus} color="text-green-600" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Candidatures en étude" value={loading ? "…" : stats?.reviewingApplicants ?? 0} icon={ClipboardCheck} color="text-amber-600" />
        <StatCard label="Inscriptions actives" value={loading ? "…" : stats?.activeEnrollments ?? 0} icon={ClipboardCheck} color="text-green-600" />
        <StatCard label="Total inscriptions" value={loading ? "…" : stats?.totalEnrollments ?? 0} icon={Users} />
        <StatCard label="Montant encaissé" value="—" icon={Wallet} color="text-green-600" />
      </div>
    </div>
  );
}

function AdminScolariteDashboard({ stats, loading }: { stats: DashboardStats | null; loading: boolean }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Nouvelles candidatures" value={loading ? "…" : stats?.newApplicants ?? 0} icon={UserPlus} />
        <StatCard label="En cours d'étude" value={loading ? "…" : stats?.reviewingApplicants ?? 0} icon={ClipboardCheck} color="text-amber-600" />
        <StatCard label="Acceptées" value={loading ? "…" : stats?.admittedApplicants ?? 0} icon={UserPlus} color="text-green-600" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total étudiants" value={loading ? "…" : stats?.totalStudents ?? 0} icon={GraduationCap} />
        <StatCard label="Inscriptions actives" value={loading ? "…" : stats?.activeEnrollments ?? 0} icon={ClipboardCheck} color="text-green-600" />
        <StatCard label="Total inscriptions" value={loading ? "…" : stats?.totalEnrollments ?? 0} icon={Users} />
      </div>
    </div>
  );
}

function ComptabiliteDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total facturé" value="—" icon={Wallet} />
        <StatCard label="Total encaissé" value="—" icon={TrendingUp} color="text-green-600" />
        <StatCard label="Reste à payer" value="—" icon={AlertCircle} color="text-amber-600" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Paiements récents" value="—" icon={Wallet} />
        <StatCard label="Impayés" value="—" icon={AlertCircle} color="text-red-600" />
        <StatCard label="Dépenses" value="—" icon={FileText} />
      </div>
      <Card className="p-6">
        <EmptyState
          title="Données en cours de configuration"
          message="Les statistiques apparaîtront ici une fois les données saisies dans le système."
        />
      </Card>
    </div>
  );
}

function FormateurDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Mes classes" value="—" icon={Users} />
        <StatCard label="Mes cours" value="—" icon={BookOpen} />
        <StatCard label="Prochains cours" value="—" icon={CalendarDays} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Présences à enregistrer" value="—" icon={ClipboardCheck} color="text-amber-600" />
        <StatCard label="Évaluations à corriger" value="—" icon={Award} color="text-amber-600" />
      </div>
      <Card className="p-6">
        <EmptyState
          title="Aucune donnée disponible"
          message="Vos classes et cours apparaîtront ici une fois qu'ils vous seront attribués."
        />
      </Card>
    </div>
  );
}

function EtudiantDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Ma formation" value="—" icon={BookOpen} />
        <StatCard label="Ma classe" value="—" icon={Users} />
        <StatCard label="Prochains cours" value="—" icon={CalendarDays} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Mes absences" value="—" icon={AlertCircle} color="text-amber-600" />
        <StatCard label="Mes notes" value="—" icon={Award} />
        <StatCard label="Ma situation financière" value="—" icon={Wallet} />
      </div>
      <Card className="p-6">
        <EmptyState
          title="Aucune donnée disponible"
          message="Vos informations apparaîtront ici une fois votre inscription validée."
        />
      </Card>
    </div>
  );
}
