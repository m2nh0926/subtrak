import { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useOrganizations, useOrganization, useCreateOrganization, useDeleteOrganization, useAddOrgMember, useRemoveOrgMember } from "@/lib/hooks";

const roleLabel: Record<string, string> = { admin: "관리자", member: "멤버", viewer: "뷰어" };

export default function Organizations() {
  const { data: orgs, isLoading } = useOrganizations();
  const createOrg = useCreateOrganization();
  const deleteOrg = useDeleteOrganization();
  const [showCreate, setShowCreate] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createOrg.mutateAsync({ name: orgName });
    setOrgName("");
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">조직 관리</h2>
        <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />조직 추가</Button>
      </div>

      {isLoading && <p className="text-muted-foreground py-8 text-center">불러오는 중...</p>}

      {orgs && orgs.length === 0 && (
        <p className="text-muted-foreground py-8 text-center">등록된 조직이 없습니다</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {orgs?.map((org) => (
          <Card key={org.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedOrgId(org.id)}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{org.name}</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteOrg.mutate(org.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedOrgId && <OrgDetail orgId={selectedOrgId} onClose={() => setSelectedOrgId(null)} />}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>조직 추가</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-sm font-medium">조직 이름</label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="팀/가족 이름" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>취소</Button>
              <Button type="submit" disabled={createOrg.isPending}>추가</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrgDetail({ orgId, onClose }: { orgId: number; onClose: () => void }) {
  const { data: org } = useOrganization(orgId);
  const addMember = useAddOrgMember();
  const removeMember = useRemoveOrgMember();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addMember.mutateAsync({ orgId, email, role });
    setEmail("");
  };

  if (!org) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{org.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <h4 className="text-sm font-medium">멤버</h4>
          <div className="space-y-2">
            {org.members?.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border">
                <div>
                  <span className="text-sm font-medium">{m.user_name ?? m.user_email}</span>
                  <Badge variant="outline" className="ml-2">{roleLabel[m.role] ?? m.role}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeMember.mutate({ orgId, memberId: m.id })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          <form onSubmit={handleAdd} className="flex gap-2">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="초대할 이메일" className="flex-1" required />
            <select className="h-10 rounded-md border border-input px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">관리자</option>
              <option value="member">멤버</option>
              <option value="viewer">뷰어</option>
            </select>
            <Button type="submit" disabled={addMember.isPending}>초대</Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
