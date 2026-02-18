import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
      navigate("/");
    } catch {
      setError("회원가입에 실패했습니다. 이미 등록된 이메일일 수 있습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">SubTrak</CardTitle>
          <p className="text-muted-foreground text-sm">새 계정을 만드세요</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <div>
              <label className="text-sm font-medium">이름</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" required />
            </div>
            <div>
              <label className="text-sm font-medium">이메일</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required />
            </div>
            <div>
              <label className="text-sm font-medium">비밀번호</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8자 이상" required />
            </div>
            <div>
              <label className="text-sm font-medium">비밀번호 확인</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="비밀번호 확인" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "가입 중..." : "회원가입"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link to="/login" className="text-primary underline">로그인</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
