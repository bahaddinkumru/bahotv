import { useState } from "react";
import { Search, Filter, UserX, UserCheck, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";

interface User {
  id: number;
  email: string;
  university: "SAÜ" | "SUBU";
  gender: "Erkek" | "Kadın";
  status: "active" | "banned" | "inactive";
  lastSeen: string;
  matchCount: number;
  reportCount: number;
  role: "user" | "admin";
}

const mockUsers: User[] = [
  {
    id: 1,
    email: "ahmet.yilmaz@sau.edu.tr",
    university: "SAÜ",
    gender: "Erkek",
    status: "active",
    lastSeen: "2 dakika önce",
    matchCount: 47,
    reportCount: 0,
    role: "user",
  },
  {
    id: 2,
    email: "ayse.kaya@subu.edu.tr",
    university: "SUBU",
    gender: "Kadın",
    status: "active",
    lastSeen: "5 dakika önce",
    matchCount: 32,
    reportCount: 1,
    role: "user",
  },
  {
    id: 3,
    email: "mehmet.demir@sau.edu.tr",
    university: "SAÜ",
    gender: "Erkek",
    status: "banned",
    lastSeen: "1 saat önce",
    matchCount: 89,
    reportCount: 5,
    role: "user",
  },
  {
    id: 4,
    email: "zeynep.arslan@subu.edu.tr",
    university: "SUBU",
    gender: "Kadın",
    status: "active",
    lastSeen: "1 dakika önce",
    matchCount: 15,
    reportCount: 0,
    role: "user",
  },
  {
    id: 5,
    email: "admin@bahotv.com",
    university: "SAÜ",
    gender: "Erkek",
    status: "active",
    lastSeen: "Şimdi",
    matchCount: 0,
    reportCount: 0,
    role: "admin",
  },
];

export default function Users() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [universityFilter, setUniversityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUniversity = universityFilter === "all" || user.university === universityFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesUniversity && matchesStatus;
  });

  const getStatusBadge = (status: User["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-600">Aktif</Badge>;
      case "banned":
        return <Badge className="bg-red-600">Banlı</Badge>;
      case "inactive":
        return <Badge className="bg-slate-600">Pasif</Badge>;
    }
  };

  const getUniversityBadge = (university: User["university"]) => {
    return university === "SAÜ" ? (
      <Badge className="bg-blue-600">SAÜ</Badge>
    ) : (
      <Badge className="bg-emerald-600">SUBU</Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Kullanıcı Yönetimi</h1>
        <p className="text-slate-400">
          Tüm kullanıcıları görüntüleyin, filtreleyin ve yönetin
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Kullanıcı Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Email ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-950 border-slate-800"
              />
            </div>

            <Select value={universityFilter} onValueChange={setUniversityFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-slate-950 border-slate-800">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Üniversite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Üniversiteler</SelectItem>
                <SelectItem value="SAÜ">SAÜ</SelectItem>
                <SelectItem value="SUBU">SUBU</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-slate-950 border-slate-800">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="banned">Banlı</SelectItem>
                <SelectItem value="inactive">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-slate-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-950 hover:bg-slate-950">
                  <TableHead>ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Üniversite</TableHead>
                  <TableHead>Cinsiyet</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Son Görülme</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer hover:bg-slate-800/50"
                    onClick={() => setSelectedUser(user)}
                  >
                    <TableCell className="font-mono">{user.id}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getUniversityBadge(user.university)}</TableCell>
                    <TableCell>{user.gender}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="text-slate-400">{user.lastSeen}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(user);
                        }}
                      >
                        Detay
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-slate-400">
            Toplam {filteredUsers.length} kullanıcı gösteriliyor
          </div>
        </CardContent>
      </Card>

      {/* User Detail Drawer */}
      <Sheet open={selectedUser !== null} onOpenChange={() => setSelectedUser(null)}>
        <SheetContent className="bg-slate-900 border-slate-800 text-white w-full sm:max-w-lg">
          {selectedUser && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">Kullanıcı Detayı</SheetTitle>
                <SheetDescription className="text-slate-400">
                  {selectedUser.email}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Basic Info */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Kullanıcı ID</span>
                    <span className="font-mono">#{selectedUser.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Üniversite</span>
                    {getUniversityBadge(selectedUser.university)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Cinsiyet</span>
                    <span>{selectedUser.gender}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Durum</span>
                    {getStatusBadge(selectedUser.status)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Rol</span>
                    <Badge variant={selectedUser.role === "admin" ? "default" : "outline"}>
                      {selectedUser.role === "admin" ? "Admin" : "Kullanıcı"}
                    </Badge>
                  </div>
                </div>

                {/* Statistics */}
                <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                  <h3 className="font-semibold mb-3">İstatistikler</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Toplam Eşleşme</span>
                      <span className="font-semibold">{selectedUser.matchCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Alınan Şikayet</span>
                      <span className={`font-semibold ${selectedUser.reportCount > 0 ? 'text-red-400' : ''}`}>
                        {selectedUser.reportCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Son Görülme</span>
                      <span className="text-sm">{selectedUser.lastSeen}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Yönetim İşlemleri</h3>
                  
                  {selectedUser.status === "active" ? (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => {
                        setUsers((prev) =>
                          prev.map((u) =>
                            u.id === selectedUser.id ? { ...u, status: "banned" } : u
                          )
                        );
                        setSelectedUser({ ...selectedUser, status: "banned" });
                      }}
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Kullanıcıyı Banla
                    </Button>
                  ) : selectedUser.status === "banned" ? (
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        setUsers((prev) =>
                          prev.map((u) =>
                            u.id === selectedUser.id ? { ...u, status: "active" } : u
                          )
                        );
                        setSelectedUser({ ...selectedUser, status: "active" });
                      }}
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Banı Kaldır
                    </Button>
                  ) : null}

                  {selectedUser.role === "user" && (
                    <Button
                      variant="outline"
                      className="w-full border-slate-700"
                      onClick={() => {
                        setUsers((prev) =>
                          prev.map((u) =>
                            u.id === selectedUser.id ? { ...u, role: "admin" } : u
                          )
                        );
                        setSelectedUser({ ...selectedUser, role: "admin" });
                      }}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Admin Yap
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
