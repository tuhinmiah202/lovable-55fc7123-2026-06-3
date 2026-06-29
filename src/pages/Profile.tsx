import { useState, useEffect } from "react";
import { User, BookOpen, Upload, LogOut, Loader2, Clock, Edit, Eye, Save, X, Trash2, FileText, Plus, ChevronDown, ChevronUp, Wallet, Check, Camera } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useBooks";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import SettingsMenu from "@/components/SettingsMenu";
import WithdrawModal from "@/components/WithdrawModal";
import { uploadBookPartFile } from "@/lib/partFiles";

const Profile = () => {
  const { user, userName, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();

  const [searchParamsProfile] = useSearchParams();
  const initialTab = searchParamsProfile.get("tab") === "purchased" ? "purchased" : "books";
  const [activeTab, setActiveTab] = useState<"books" | "upload" | "history" | "earnings" | "purchased">(initialTab as any);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadAuthor, setUploadAuthor] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadPrice, setUploadPrice] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState("");
  const [myUploads, setMyUploads] = useState<any[]>([]);
  const [readingHistory, setReadingHistory] = useState<any[]>([]);
  const [approvedBooks, setApprovedBooks] = useState<any[]>([]);
  const [purchasedBooks, setPurchasedBooks] = useState<any[]>([]);
  const [confirmedOrders, setConfirmedOrders] = useState<any[]>([]);
  const [allBookParts, setAllBookParts] = useState<Record<string, any[]>>({});
  const [adUnlocksByBook, setAdUnlocksByBook] = useState<Record<string, number>>({});
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [myWithdrawals, setMyWithdrawals] = useState<any[]>([]);
  const [showAllParts, setShowAllParts] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Parts (পর্ব) for upload
  const [parts, setParts] = useState<{ title: string; content: string }[]>([
    { title: "পর্ব ১", content: "" },
    { title: "পর্ব ২", content: "" },
    { title: "পর্ব ৩", content: "" },
  ]);

  // Writer info
  const [isWriter, setIsWriter] = useState(false);
  const [writerBlocked, setWriterBlocked] = useState(false);
  const [writerInfoLoaded, setWriterInfoLoaded] = useState(false);

  // Writer application
  const [writerApplication, setWriterApplication] = useState<any>(null);
  const [writerAppName, setWriterAppName] = useState("");
  const [writerAppMobile, setWriterAppMobile] = useState("");
  const [writerAppHometown, setWriterAppHometown] = useState("");
  const [writerAppVillage, setWriterAppVillage] = useState("");
  const [writerAppFbPage, setWriterAppFbPage] = useState("");
  const [writerAppFbId, setWriterAppFbId] = useState("");
  const [writerAppSubmitting, setWriterAppSubmitting] = useState(false);
  const [writerAppSuccess, setWriterAppSuccess] = useState(false);

  // View book detail modal
  const [viewingBook, setViewingBook] = useState<any>(null);
  const [bookParts, setBookParts] = useState<any[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);

  // Add new part
  const [addingPartBookId, setAddingPartBookId] = useState<string | null>(null);
  const [newPartTitle, setNewPartTitle] = useState("");
  const [newPartContent, setNewPartContent] = useState("");
  const [addingPartSubmitting, setAddingPartSubmitting] = useState(false);
  const [pendingPartUploads, setPendingPartUploads] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchMyUploads();
      fetchProfile();
      fetchReadingHistory();
      fetchApprovedBooks();
      fetchWriterApplication();
      fetchPurchasedBooks();
      fetchConfirmedOrders();
      fetchMyWithdrawals();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await (supabase
      .from("profiles") as any)
      .select("is_writer, writer_blocked, avatar_url")
      .eq("id", user!.id)
      .maybeSingle();
    if (data) {
      setIsWriter(data.is_writer || false);
      setWriterBlocked(!!data.writer_blocked);
      setAvatarUrl(data.avatar_url || null);
    }
    setWriterInfoLoaded(true);
  };

  const fetchWriterApplication = async () => {
    const { data } = await supabase
      .from("writer_applications")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();
    setWriterApplication(data);
    if (!data) {
      setWriterAppName(userName || "");
    }
  };

  const fetchMyUploads = async () => {
    const { data } = await supabase
      .from("book_uploads")
      .select("*, categories(name)")
      .eq("user_id", user!.id)
      .eq("is_new_part", false)
      .order("created_at", { ascending: false });
    setMyUploads(data || []);
  };

  const fetchReadingHistory = async () => {
    const { data } = await supabase
      .from("reading_history")
      .select("*, books(id, title, author, cover_url)")
      .eq("user_id", user!.id)
      .order("last_read_at", { ascending: false })
      .limit(5);
    setReadingHistory(data || []);
  };

  const fetchMyWithdrawals = async () => {
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setMyWithdrawals(data || []);
  };

  const saveName = async () => {
    if (!user || !nameInput.trim()) return;
    setSavingName(true);
    const newName = nameInput.trim().slice(0, 80);
    const { error } = await supabase
      .from("profiles")
      .update({ name: newName })
      .eq("id", user.id);
    if (error) {
      setSavingName(false);
      alert(error.message);
      return;
    }
    await refreshProfile();
    setSavingName(false);
    setEditingName(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("প্রোফাইল ছবি ২MB এর বেশি হতে পারবে না!");
      return;
    }
    setUploadingAvatar(true);
    try {
      // Delete previous avatars in the user's avatar folder
      const folder = `${user.id}/avatar`;
      const { data: existing } = await supabase.storage.from("cover-photos").list(folder);
      if (existing && existing.length > 0) {
        await supabase.storage
          .from("cover-photos")
          .remove(existing.map((f) => `${folder}/${f.name}`));
      }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${folder}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("cover-photos")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("cover-photos").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl } as any)
        .eq("id", user.id);
      if (updErr) throw updErr;
      setAvatarUrl(publicUrl);
    } catch (err: any) {
      alert(err.message || "প্রোফাইল ছবি আপলোড ব্যর্থ হয়েছে");
    }
    setUploadingAvatar(false);
    e.target.value = "";
  };

  const handleAvatarDelete = async () => {
    if (!user || !avatarUrl) return;
    if (!confirm("প্রোফাইল ছবি মুছে ফেলতে চান?")) return;
    setUploadingAvatar(true);
    try {
      const folder = `${user.id}/avatar`;
      const { data: existing } = await supabase.storage.from("cover-photos").list(folder);
      if (existing && existing.length > 0) {
        await supabase.storage
          .from("cover-photos")
          .remove(existing.map((f) => `${folder}/${f.name}`));
      }
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: null } as any)
        .eq("id", user.id);
      if (updErr) throw updErr;
      setAvatarUrl(null);
    } catch (err: any) {
      alert(err.message || "প্রোফাইল ছবি মুছে ফেলা ব্যর্থ হয়েছে");
    }
    setUploadingAvatar(false);
  };

  const fetchApprovedBooks = async () => {
    const { data } = await supabase
      .from("books")
      .select("id, title, author, cover_url, price, created_at, description, content, category_id, categories(name)")
      .eq("uploader_id", user!.id)
      .order("created_at", { ascending: false });
    setApprovedBooks(data || []);
    const ids = (data || []).map((b: any) => b.id);
    if (ids.length > 0) {
      const { data: partsData } = await supabase
        .from("book_parts")
        .select("id, book_id, part_number, title, views")
        .in("book_id", ids)
        .order("part_number", { ascending: true });
      const grouped: Record<string, any[]> = {};
      (partsData || []).forEach((p: any) => {
        (grouped[p.book_id] = grouped[p.book_id] || []).push(p);
      });
      setAllBookParts(grouped);
    }
  };

  const fetchPurchasedBooks = async () => {
    const { data: ordersData } = await supabase
      .from("book_orders")
      .select("*, books(id, title, author, cover_url, price)")
      .eq("user_id", user!.id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false });
    setPurchasedBooks((ordersData || []).map((o: any) => ({ ...o.books, order_date: o.created_at })).filter(Boolean));
  };

  const fetchConfirmedOrders = async () => {
    const { data: writerBooks } = await supabase
      .from("books")
      .select("id")
      .eq("uploader_id", user!.id);
    if (writerBooks && writerBooks.length > 0) {
      const bookIds = writerBooks.map((b: any) => b.id);
      const { data: ordersData } = await supabase
        .from("book_orders")
        .select("*, books(id, title, price)")
        .in("book_id", bookIds)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false });
      setConfirmedOrders(ordersData || []);
      // Ad unlocks — these are the ONLY views that count toward ad revenue.
      const { data: adData } = await supabase
        .from("ad_unlocks")
        .select("book_id")
        .in("book_id", bookIds);
      const grouped: Record<string, number> = {};
      (adData || []).forEach((r: any) => {
        grouped[r.book_id] = (grouped[r.book_id] || 0) + 1;
      });
      setAdUnlocksByBook(grouped);
    } else {
      setConfirmedOrders([]);
      setAdUnlocksByBook({});
    }
  };

  const fetchBookParts = async (bookId: string) => {
    setLoadingParts(true);
    const { data } = await supabase
      .from("book_parts")
      .select("*")
      .eq("book_id", bookId)
      .order("part_number", { ascending: true });
    setBookParts(data || []);

    // Fetch pending part uploads for this book
    const { data: pendingParts } = await supabase
      .from("book_uploads")
      .select("*")
      .eq("user_id", user!.id)
      .eq("book_id", bookId)
      .eq("is_new_part", true)
      .eq("status", "pending");
    setPendingPartUploads(pendingParts || []);
    setLoadingParts(false);
  };

  const handleWriterApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setWriterAppSubmitting(true);

    try {
      if (!writerAppMobile.trim()) {
        setError("মোবাইল নম্বর দিতে হবে!");
        setWriterAppSubmitting(false);
        return;
      }

      const { error: insertErr } = await supabase.from("writer_applications").insert({
        user_id: user.id,
        name: writerAppName.trim() || userName || "",
        mobile_number: writerAppMobile.trim(),
        hometown: writerAppHometown.trim(),
        village: writerAppVillage.trim(),
        facebook_page: writerAppFbPage.trim(),
        facebook_id: writerAppFbId.trim(),
      });
      if (insertErr) throw insertErr;

      setWriterAppSuccess(true);
      fetchWriterApplication();
      setTimeout(() => setWriterAppSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || "আবেদন ব্যর্থ হয়েছে");
    }
    setWriterAppSubmitting(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setSubmitting(true);

    try {
      // Re-verify the live Supabase session before insert. Cached `user`
      // from context may not match auth.uid() if the session expired.
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser) {
        setError("সেশন শেষ হয়েছে — আবার লগইন করুন");
        setSubmitting(false);
        return;
      }

      if (coverFile && coverFile.size > 500 * 1024) {
        setError("কভার ফটো ৫০০KB এর বেশি হতে পারবে না!");
        setSubmitting(false);
        return;
      }

      // Validate minimum 3 parts with content
      const filledParts = parts.filter(p => p.content.trim());
      if (filledParts.length < 3) {
        setError("সর্বনিম্ন ৩টি পর্ব লিখতে হবে!");
        setSubmitting(false);
        return;
      }

      let coverUrl: string | null = null;

      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `${authUser.id}/${Date.now()}.${ext}`;
        const { error: coverErr } = await supabase.storage.from("cover-photos").upload(path, coverFile);
        if (coverErr) throw new Error("কভার ছবি আপলোড ব্যর্থ: " + coverErr.message);
        const { data: urlData } = supabase.storage.from("cover-photos").getPublicUrl(path);
        coverUrl = urlData.publicUrl;
      }

      // Store parts as JSON in content field
      const partsData = parts
        .filter(p => p.content.trim())
        .map((p, i) => ({ part_number: i + 1, title: p.title.trim() || `পর্ব ${i + 1}`, content: p.content.trim() }));

      const { error: insertErr } = await supabase.from("book_uploads").insert({
        user_id: authUser.id,
        title: uploadTitle.trim(),
        author_name: uploadAuthor.trim() || userName || "",
        description: uploadDesc.trim(),
        content: JSON.stringify(partsData),
        cover_url: coverUrl,
        category_id: uploadCategory || null,
        price: parseInt(uploadPrice) || 0,
        is_new_part: false,
      });
      if (insertErr) throw insertErr;


      setUploadSuccess(true);
      setUploadTitle(""); setUploadAuthor(""); setUploadDesc("");
      setUploadCategory(""); setUploadPrice("");
      setCoverFile(null); setCoverPreview(null);
      setParts([
        { title: "পর্ব ১", content: "" },
        { title: "পর্ব ২", content: "" },
        { title: "পর্ব ৩", content: "" },
      ]);
      fetchMyUploads();
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || "আপলোড ব্যর্থ হয়েছে");
    }
    setSubmitting(false);
  };

  const addPart = () => {
    setParts([...parts, { title: `পর্ব ${parts.length + 1}`, content: "" }]);
  };

  const updatePart = (index: number, field: "title" | "content", value: string) => {
    const newParts = [...parts];
    newParts[index][field] = value;
    setParts(newParts);
  };

  const removePart = (index: number) => {
    if (parts.length <= 3) return; // Minimum 3 parts
    const newParts = parts.filter((_, i) => i !== index);
    setParts(newParts);
  };

  const openBookDetail = async (book: any) => {
    setViewingBook(book);
    await fetchBookParts(book.id);
  };

  const handleAddNewPart = async () => {
    if (!user || !addingPartBookId) return;
    if (!newPartContent.trim()) {
      setError("পর্বের বিষয়বস্তু লিখুন!");
      return;
    }

    setAddingPartSubmitting(true);
    setError("");

    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser) {
        setError("সেশন শেষ হয়েছে — আবার লগইন করুন");
        setAddingPartSubmitting(false);
        return;
      }

      // Find the next part number
      const nextPartNumber = bookParts.length + pendingPartUploads.length + 1;

      const { error: insertErr } = await supabase.from("book_uploads").insert({
        user_id: authUser.id,
        title: viewingBook?.title || "",
        author_name: viewingBook?.author || userName || "",
        content: JSON.stringify([{
          part_number: nextPartNumber,
          title: newPartTitle.trim() || `পর্ব ${nextPartNumber}`,
          content: newPartContent.trim()
        }]),
        book_id: addingPartBookId,
        part_number: nextPartNumber,
        is_new_part: true,
        category_id: viewingBook?.category_id || null,
        price: 0,
      });
      if (insertErr) throw insertErr;


      setNewPartTitle("");
      setNewPartContent("");
      setAddingPartBookId(null);
      await fetchBookParts(viewingBook.id);
    } catch (err: any) {
      setError(err.message || "পর্ব আপলোড ব্যর্থ হয়েছে");
    }
    setAddingPartSubmitting(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Determine upload tab content
  const canUploadBooks = isWriter;
  const hasPendingApplication = writerApplication && writerApplication.status === 'pending';
  const hasRejectedApplication = writerApplication && writerApplication.status === 'rejected';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="mb-8 flex flex-col items-center gap-4 rounded-2xl bg-card p-8 shadow-card sm:flex-row sm:items-start">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-8 w-8" />
          )}
        </div>
        <div className="text-center sm:text-left flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={80}
                autoFocus
                className="rounded-lg border border-input bg-background px-3 py-2 text-base font-bold outline-none focus:border-primary"
              />
              <button
                onClick={saveName}
                disabled={savingName}
                className="rounded-lg bg-primary p-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
                title="সংরক্ষণ"
              >
                {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </button>
              <button
                onClick={() => { setEditingName(false); setNameInput(userName || ""); }}
                className="rounded-lg bg-muted p-2 text-muted-foreground hover:text-foreground"
                title="বাতিল"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <h1 className="text-2xl font-bold truncate">{userName || "ব্যবহারকারী"}</h1>
          )}
          <p className="text-muted-foreground text-sm">{user?.email}</p>
          {isWriter && !writerBlocked && <span className="mt-1 inline-block rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">✍️ লেখক</span>}
          {writerBlocked && <span className="mt-1 inline-block rounded-lg bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">⛔ লেখক প্রোফাইল ব্লক</span>}
          {!editingName && (
            <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
              <button
                onClick={() => { setNameInput(userName || ""); setEditingName(true); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
              >
                <Edit className="h-3.5 w-3.5" /> নাম পরিবর্তন
              </button>
              {isWriter && !writerBlocked && (
                <label className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground cursor-pointer hover:opacity-90">
                  {uploadingAvatar ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> আপলোড হচ্ছে…</>
                  ) : (
                    <><Camera className="h-3.5 w-3.5" /> প্রোফাইল ছবি আপলোড</>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </label>
              )}
              {isWriter && !writerBlocked && avatarUrl && (
                <button
                  onClick={handleAvatarDelete}
                  disabled={uploadingAvatar}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> ছবি মুছুন
                </button>
              )}
            </div>
          )}
        </div>
        <SettingsMenu onLogout={handleLogout} />
      </div>

      {writerBlocked && (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center">
          <p className="text-sm font-semibold text-destructive mb-1">আপনার লেখক প্রোফাইল এডমিন কর্তৃক ব্লক করা হয়েছে।</p>
          <p className="text-xs text-muted-foreground mb-3">আপনি আপাতত বই আপলোড বা আয় সেকশন ব্যবহার করতে পারবেন না। সাহায্যের জন্য সাহায্য সেকশন থেকে যোগাযোগ করুন।</p>
          <button onClick={() => navigate("/help")} className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">সাহায্য নিন</button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        <button onClick={() => setActiveTab("books")} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${activeTab === "books" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
          <BookOpen className="h-4 w-4" /> আমার আপলোড
        </button>
        <button onClick={() => setActiveTab("purchased")} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${activeTab === "purchased" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
          🛒 ক্রয়কৃত বই
        </button>
        {!writerBlocked && (
          <button onClick={() => setActiveTab("upload")} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${activeTab === "upload" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
            <Upload className="h-4 w-4" /> বই আপলোড
          </button>
        )}
        <button onClick={() => setActiveTab("history")} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${activeTab === "history" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
          <Clock className="h-4 w-4" /> পড়ার ইতিহাস
        </button>
        {isWriter && !writerBlocked && (
          <button onClick={() => setActiveTab("earnings")} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${activeTab === "earnings" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
            💰 আয়
          </button>
        )}
      </div>

      {/* My Uploads Tab */}
      {activeTab === "books" && (
        <div>
          <h2 className="text-xl font-bold mb-4">আমার আপলোড করা বই</h2>

          {/* Approved books (clickable) */}
          {approvedBooks.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">✅ অনুমোদিত বই</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                {approvedBooks.map((book) => (
                  <div key={book.id} onClick={() => openBookDetail(book)}
                    className="group cursor-pointer flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-all hover:shadow-card-hover">
                    <div className="aspect-[3/4] overflow-hidden bg-muted">
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center"><BookOpen className="h-6 w-6 text-muted-foreground" /></div>
                      )}
                    </div>
                    <div className="p-1.5 sm:p-2">
                      <h4 className="font-bold text-xs line-clamp-1">{book.title}</h4>
                      <p className="text-[10px] font-semibold text-primary mt-0.5">{book.price === 0 ? "ফ্রি" : `৳${book.price}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending/Rejected uploads */}
          {myUploads.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">⏳ অপেক্ষমান / বাতিল</h3>
              <div className="flex flex-col gap-3">
                {myUploads.map((upload) => (
                  <div key={upload.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-center gap-3">
                      {upload.cover_url ? (
                        <img src={upload.cover_url} alt="" className="h-14 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-14 w-10 items-center justify-center rounded-lg bg-muted"><BookOpen className="h-5 w-5 text-muted-foreground" /></div>
                      )}
                      <div>
                        <p className="font-bold">{upload.title}</p>
                        <p className="text-xs text-muted-foreground">{(upload as any).categories?.name || ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {upload.status === "pending" && (
                        <button onClick={async () => {
                          if (!confirm("আপনি কি এই বইটি মুছে ফেলতে চান?")) return;
                          const { error } = await supabase.from("book_uploads").delete().eq("id", upload.id);
                          if (error) alert(error.message);
                          else fetchMyUploads();
                        }} className="rounded-lg p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="মুছে ফেলুন">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                        upload.status === "approved" ? "bg-primary/10 text-primary" :
                        upload.status === "rejected" ? "bg-destructive/10 text-destructive" :
                        "bg-accent/20 text-accent-foreground"
                      }`}>
                        {upload.status === "approved" ? "অনুমোদিত" : upload.status === "rejected" ? "বাতিল" : "অপেক্ষমান"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {approvedBooks.length === 0 && myUploads.length === 0 && (
            <p className="text-muted-foreground py-10 text-center">আপনি এখনো কোনো বই আপলোড করেননি।</p>
          )}
        </div>
      )}

      {/* Book Detail Modal (read-only + add part) */}
      {viewingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">বইয়ের বিস্তারিত</h3>
              <button onClick={() => { setViewingBook(null); setAddingPartBookId(null); }} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex gap-4 mb-6">
              {viewingBook.cover_url ? (
                <img src={viewingBook.cover_url} alt="" className="h-32 w-24 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="flex h-32 w-24 items-center justify-center rounded-xl bg-muted flex-shrink-0"><BookOpen className="h-8 w-8 text-muted-foreground" /></div>
              )}
              <div>
                <h4 className="text-xl font-bold">{viewingBook.title}</h4>
                <p className="text-sm text-muted-foreground">{viewingBook.author}</p>
                <p className="text-sm text-muted-foreground mt-1">{(viewingBook as any).categories?.name || ""}</p>
                <p className="text-sm font-semibold text-primary mt-2">{viewingBook.price === 0 ? "ফ্রি" : `৳${viewingBook.price}`}</p>
              </div>
            </div>

            {viewingBook.description && (
              <div className="mb-4">
                <h5 className="text-sm font-semibold mb-1">বিবরণ</h5>
                <p className="text-sm text-muted-foreground">{viewingBook.description}</p>
              </div>
            )}

            {/* Parts list */}
            <div className="mb-4">
              <h5 className="text-sm font-semibold mb-2">পর্বসমূহ ({bookParts.length})</h5>
              {loadingParts ? (
                <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="flex flex-col gap-2">
                  {(showAllParts ? bookParts : bookParts.slice(0, 3)).map((part) => (
                    <div key={part.id} className="rounded-lg border border-border p-3 bg-muted/50">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{part.title || `পর্ব ${part.part_number}`}</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${part.status === 'approved' ? 'bg-primary/10 text-primary' : 'bg-accent/20 text-accent-foreground'}`}>
                          {part.status === 'approved' ? 'অনুমোদিত' : 'অপেক্ষমান'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{part.content.substring(0, 100)}...</p>
                    </div>
                  ))}
                  {bookParts.length > 3 && (
                    <button
                      onClick={() => setShowAllParts((v) => !v)}
                      className="text-xs font-semibold text-primary hover:underline self-start mt-1"
                    >
                      {showAllParts ? "কম দেখুন" : `আরও দেখুন (${bookParts.length - 3} টি পর্ব)`}
                    </button>
                  )}
                  {bookParts.length === 0 && <p className="text-sm text-muted-foreground">কোনো পর্ব পাওয়া যায়নি।</p>}
                </div>
              )}

              {/* Pending part uploads */}
              {pendingPartUploads.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-accent-foreground mb-1">⏳ অনুমোদনের অপেক্ষায়:</p>
                  {pendingPartUploads.map((pu) => (
                    <div key={pu.id} className="rounded-lg border border-accent/30 p-2 bg-accent/10 text-sm">
                      পর্ব {pu.part_number} — অপেক্ষমান
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add new part button/form */}
            {writerBlocked ? (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3 text-center">
                ⛔ আপনার লেখক প্রোফাইল ব্লক করা — নতুন পর্ব যোগ করা যাবে না।
              </p>
            ) : pendingPartUploads.length === 0 ? (
              addingPartBookId === viewingBook.id ? (
                <div className="rounded-xl border border-border p-4 bg-background">
                  <h5 className="text-sm font-semibold mb-3">নতুন পর্ব যোগ করুন (পর্ব {bookParts.length + 1})</h5>
                  {error && <div className="mb-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
                  <div className="flex flex-col gap-3">
                    <input type="text" value={newPartTitle} onChange={(e) => setNewPartTitle(e.target.value)}
                      placeholder={`পর্ব ${bookParts.length + 1} এর শিরোনাম (ঐচ্ছিক)`}
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
                    {/* File upload — stored on Supabase Storage, not DB */}
                    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                      <label className="text-xs font-semibold text-primary mb-2 block">📎 ফাইল আপলোড করুন (.txt বা .pdf)</label>
                      <input
                        type="file"
                        accept=".txt,.pdf,text/plain,application/pdf"
                        disabled={addingPartSubmitting}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f || !user) return;
                          try {
                            setAddingPartSubmitting(true);
                            const marker = await uploadBookPartFile(f, user.id);
                            setNewPartContent(marker);
                          } catch (err: any) {
                            setError("ফাইল আপলোড ব্যর্থ: " + (err?.message || err));
                          } finally {
                            setAddingPartSubmitting(false);
                            e.target.value = "";
                          }
                        }}
                        className="w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground"
                      />
                      {newPartContent.startsWith("file::") && (
                        <p className="text-[11px] text-primary mt-2">✅ ফাইল প্রস্তুত (Supabase Storage)</p>
                      )}
                      
                    </div>
                    <p className="text-[11px] text-muted-foreground -mb-1">অথবা সরাসরি লিখুন:</p>
                    <textarea value={newPartContent.startsWith("file::") ? "" : newPartContent} onChange={(e) => setNewPartContent(e.target.value)}
                      rows={8} placeholder="এখানে পর্বের বিষয়বস্তু লিখুন অথবা কপি পেস্ট করুন..."
                      disabled={newPartContent.startsWith("file::")}
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary resize-none disabled:opacity-50" />
                    <div className="flex gap-2">
                      <button onClick={handleAddNewPart} disabled={addingPartSubmitting}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                        {addingPartSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        পর্ব জমা দিন (অ্যাডমিন অনুমোদন প্রয়োজন)
                      </button>
                      <button onClick={() => setAddingPartBookId(null)} className="rounded-xl bg-muted px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">বাতিল</button>
                    </div>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAddingPartBookId(viewingBook.id); setError(""); }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary/10 py-3 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors">
                  <Plus className="h-4 w-4" /> নতুন পর্ব যোগ করুন
                </button>
              )
            ) : (
              <p className="text-sm text-accent-foreground bg-accent/10 rounded-xl p-3 text-center">
                ⚠️ আপনার পূর্ববর্তী পর্বটি অনুমোদনের অপেক্ষায় রয়েছে। অনুমোদনের পর আরেকটি পর্ব যোগ করতে পারবেন।
              </p>
            )}
          </div>
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === "upload" && !writerBlocked && (
        <div className="max-w-xl">
          {/* Not a writer and no application yet → show writer application form */}
          {!canUploadBooks && !writerApplication && writerInfoLoaded && (
            <div>
              <h2 className="text-xl font-bold mb-2">লেখক হিসেবে আবেদন করুন</h2>
              <p className="text-sm text-muted-foreground mb-6">বই আপলোড করতে হলে প্রথমে লেখক হিসেবে আবেদন করতে হবে। অ্যাডমিনের অনুমোদনের পর আপনি বই আপলোড করতে পারবেন।</p>

              {writerAppSuccess && (
                <div className="mb-4 rounded-xl bg-primary/10 p-4 text-sm text-primary font-medium">
                  ✅ আবেদনটি সফলভাবে জমা হয়েছে! অ্যাডমিনের অনুমোদনের জন্য অপেক্ষা করুন।
                </div>
              )}
              {error && <div className="mb-4 rounded-xl bg-destructive/10 p-4 text-sm text-destructive font-medium">{error}</div>}

              <form onSubmit={handleWriterApplication} className="flex flex-col gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">লেখকের নাম *</label>
                  <input type="text" value={writerAppName} onChange={(e) => setWriterAppName(e.target.value)}
                    placeholder={userName || "আপনার নাম"}
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">মোবাইল নম্বর *</label>
                  <input type="text" value={writerAppMobile} onChange={(e) => setWriterAppMobile(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">জেলা / শহর</label>
                  <input type="text" value={writerAppHometown} onChange={(e) => setWriterAppHometown(e.target.value)}
                    placeholder="আপনার জেলা বা শহরের নাম"
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">গ্রাম</label>
                  <input type="text" value={writerAppVillage} onChange={(e) => setWriterAppVillage(e.target.value)}
                    placeholder="আপনার গ্রামের নাম"
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">ফেসবুক পেজ লিংক</label>
                  <input type="url" value={writerAppFbPage} onChange={(e) => setWriterAppFbPage(e.target.value)}
                    placeholder="https://facebook.com/your.page"
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">ফেসবুক আইডি লিংক</label>
                  <input type="url" value={writerAppFbId} onChange={(e) => setWriterAppFbId(e.target.value)}
                    placeholder="https://facebook.com/your.id"
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
                </div>
                <button type="submit" disabled={writerAppSubmitting}
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50">
                  {writerAppSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <FileText className="h-4 w-4" /> লেখক আবেদন জমা দিন
                </button>
              </form>
            </div>
          )}

          {/* Pending application */}
          {!canUploadBooks && hasPendingApplication && (
            <div className="text-center py-16">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
                <Clock className="h-8 w-8 text-accent-foreground" />
              </div>
              <h2 className="text-xl font-bold mb-2">আবেদন অপেক্ষমান</h2>
              <p className="text-muted-foreground text-sm">আপনার লেখক আবেদনটি অ্যাডমিনের অনুমোদনের অপেক্ষায় রয়েছে। অনুমোদনের পর আপনি বই আপলোড করতে পারবেন।</p>
            </div>
          )}

          {/* Rejected application */}
          {!canUploadBooks && hasRejectedApplication && (
            <div className="text-center py-16">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <X className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold mb-2">আবেদন বাতিল হয়েছে</h2>
              <p className="text-muted-foreground text-sm mb-4">দুঃখিত, আপনার লেখক আবেদনটি বাতিল করা হয়েছে।</p>
              <button onClick={async () => {
                await supabase.from("writer_applications").delete().eq("id", writerApplication.id);
                setWriterApplication(null);
              }} className="rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                পুনরায় আবেদন করুন
              </button>
            </div>
          )}

          {/* Approved writer → show book upload form */}
          {canUploadBooks && (
            <div>
              <h2 className="text-xl font-bold mb-4">বই আপলোড</h2>
              <p className="text-sm text-muted-foreground mb-4">বই আপলোড করতে আমাদের সাথে যোগাযোগ করুন। আমরা আপনার বই প্রকাশ করতে সাহায্য করব।</p>

              <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
                <p className="text-lg font-bold mb-2">📚 আপনার বই প্রকাশ করুন</p>
                <p className="text-sm text-muted-foreground mb-4">বইয়ের পাণ্ডুলিপি পাঠাতে আমাদের ফেসবুকে যোগাযোগ করুন:</p>
                <div className="flex justify-center">
                  <a href="https://www.facebook.com/share/1CFYChmwrj/" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(214,89%,52%)] px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition-all">
                    📘 ফেসবুকে যোগাযোগ করুন
                  </a>
                </div>
                <p className="text-xs text-muted-foreground mt-3">আমরা আপনার বই পর্যালোচনা করে অনুমোদন করব এবং প্রকাশ করব।</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reading History Tab */}
      {activeTab === "history" && (
        <div>
          <h2 className="text-xl font-bold mb-4">পড়ার ইতিহাস</h2>
          {readingHistory.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center">আপনি এখনো কোনো বই পড়েননি।</p>
          ) : (
            <div className="flex flex-col gap-3">
              {readingHistory.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/book/${item.book_id}`)}>
                  <div className="flex items-center gap-3">
                    {item.books?.cover_url ? (
                      <img src={item.books.cover_url} alt="" className="h-14 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-14 w-10 items-center justify-center rounded-lg bg-muted"><BookOpen className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                    <div>
                      <p className="font-bold">{item.books?.title || "অজানা বই"}</p>
                      <p className="text-xs text-muted-foreground">{item.books?.author}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(item.last_read_at).toLocaleDateString("bn-BD")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Purchased Books Tab */}
      {activeTab === "purchased" && (
        <div>
          <h2 className="text-xl font-bold mb-4">ক্রয়কৃত বই</h2>
          {purchasedBooks.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center">আপনি এখনো কোনো বই কেনেননি।</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
              {purchasedBooks.map((book: any) => (
                <div key={book.id} onClick={() => navigate(`/book/${book.id}`)}
                  className="group cursor-pointer flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-all hover:shadow-card-hover">
                  <div className="aspect-[3/4] overflow-hidden bg-muted">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><BookOpen className="h-6 w-6 text-muted-foreground" /></div>
                    )}
                  </div>
                  <div className="p-1.5 sm:p-2">
                    <h4 className="font-bold text-xs line-clamp-1">{book.title}</h4>
                    <p className="text-[10px] font-semibold text-primary mt-0.5">✅ ক্রয়কৃত</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Earnings Tab */}
      {activeTab === "earnings" && isWriter && !writerBlocked && (
        <div>
          <h2 className="text-xl font-bold mb-4">আমার বই ও আয়</h2>
          {approvedBooks.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center">এখনো কোনো অনুমোদিত বই নেই।</p>
          ) : (() => {
            const grossSales = confirmedOrders.reduce((s: number, o: any) => s + (o.amount || 0), 0);
            const writerSales = Math.round(grossSales * 0.7); // 30% admin commission
            const totalAdViews = Object.values(adUnlocksByBook).reduce((s, n) => s + n, 0);
            const adRevenue = Math.floor(totalAdViews / 5000) * 100; // 100 BDT per 5000 ad views
            const totalEarning = writerSales + adRevenue;
            const pendingWd = myWithdrawals
              .filter((w: any) => w.status === "pending")
              .reduce((s: number, w: any) => s + (w.amount || 0), 0);
            const paidWd = myWithdrawals
              .filter((w: any) => w.status === "paid")
              .reduce((s: number, w: any) => s + (w.amount || 0), 0);
            const availableForWithdraw = Math.max(0, totalEarning - pendingWd - paidWd);
            return (
              <div className="flex flex-col gap-3">
                {/* Total earnings (TOP) — net to writer after 30% admin commission */}
                <div className="rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/20 p-5 text-center">
                  <p className="text-xs text-muted-foreground mb-1">মোট আয় (অ্যাডমিন কমিশন ৩০% বাদে)</p>
                  <p className="text-3xl font-extrabold text-primary">৳{totalEarning}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>বিক্রি থেকে: ৳{writerSales} <span className="opacity-60">(গ্রস ৳{grossSales})</span></div>
                    <div>বিজ্ঞাপন থেকে: ৳{adRevenue}</div>
                  </div>
                  <button
                    onClick={() => setShowWithdraw(true)}
                    disabled={availableForWithdraw < 500}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    <Wallet className="h-4 w-4" /> টাকা উইথড্র করুন (যোগ্য ৳{availableForWithdraw})
                  </button>
                  {availableForWithdraw < 500 && (
                    <p className="text-[11px] text-muted-foreground mt-1">সর্বনিম্ন উইথড্র ৳৫০০</p>
                  )}
                </div>

                {/* My withdrawal requests */}
                {myWithdrawals.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-sm font-bold mb-2">আমার উইথড্র অনুরোধ</p>
                    <div className="flex flex-col gap-2">
                      {myWithdrawals.map((w: any) => (
                        <div key={w.id} className="flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium">৳{w.amount} <span className="text-xs text-muted-foreground">({w.method === "bkash" ? "বিকাশ" : "নগদ"} • {w.payout_number})</span></p>
                            <p className="text-[11px] text-muted-foreground">{new Date(w.created_at).toLocaleString("bn-BD")}</p>
                          </div>
                          <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${w.status === "paid" ? "bg-primary/10 text-primary" : w.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-accent/20 text-accent-foreground"}`}>
                            {w.status === "paid" ? "পরিশোধিত" : w.status === "rejected" ? "বাতিল" : "অপেক্ষমান"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ad revenue card */}
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">📺 বিজ্ঞাপন আয়</p>
                      <p className="text-xs text-muted-foreground mt-0.5">প্রতি ৫০০০ এড-ভিউয়ের জন্য ৳১০০ (শুধু এড দেখে আনলক করা পর্ব গণনা হয়, ক্রয়কৃত নয়)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-accent-foreground">৳{adRevenue}</p>
                      <p className="text-xs text-muted-foreground">{totalAdViews} এড-ভিউ</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-muted-foreground mt-4">প্রতিটি বইয়ের আয় ও পঠন</h3>
                {approvedBooks.map((book) => {
                  const bookSales = confirmedOrders.filter((o: any) => o.book_id === book.id);
                  const grossBookEarn = bookSales.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
                  const netBookEarn = Math.round(grossBookEarn * 0.7);
                  const bookPartsList = allBookParts[book.id] || [];
                  const totalViews = bookPartsList.reduce((s, p) => s + (p.views || 0), 0);
                  const bookAdViews = adUnlocksByBook[book.id] || 0;
                  const bookAdRevenue = Math.floor(bookAdViews / 5000) * 100;
                  return (
                    <div key={book.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold">{book.title}</p>
                          <p className="text-xs text-muted-foreground">মূল্য: {book.price === 0 ? "ফ্রি" : `৳${book.price}`}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">বিক্রি: {bookSales.length}</p>
                          <p className="text-xs text-muted-foreground">আয়: ৳{netBookEarn} <span className="opacity-60">(গ্রস ৳{grossBookEarn})</span></p>
                          <p className="text-xs text-muted-foreground">বিজ্ঞাপন: ৳{bookAdRevenue} ({bookAdViews} ভিউ)</p>
                          <p className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-0.5"><Eye className="h-3 w-3" />{totalViews} মোট ভিউ</p>
                        </div>
                      </div>
                      {bookPartsList.length > 0 && (
                        <div className="border-t border-border pt-2 mt-2">
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">পর্ব অনুযায়ী ভিউ</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {bookPartsList.map((p: any) => (
                              <div key={p.id} className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-xs">
                                <span>পর্ব {p.part_number}</span>
                                <span className="flex items-center gap-1 text-muted-foreground"><Eye className="h-3 w-3" />{p.views || 0}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {showWithdraw && user && (() => {
        const grossSales = confirmedOrders.reduce((s: number, o: any) => s + (o.amount || 0), 0);
        const writerSales = Math.round(grossSales * 0.7);
        const totalAdViews = Object.values(adUnlocksByBook).reduce((s, n) => s + n, 0);
        const adRevenue = Math.floor(totalAdViews / 5000) * 100;
        const totalEarning = writerSales + adRevenue;
        const pendingWd = myWithdrawals.filter((w: any) => w.status === "pending").reduce((s: number, w: any) => s + (w.amount || 0), 0);
        const paidWd = myWithdrawals.filter((w: any) => w.status === "paid").reduce((s: number, w: any) => s + (w.amount || 0), 0);
        const available = Math.max(0, totalEarning - pendingWd - paidWd);
        return (
          <WithdrawModal
            userId={user.id}
            availableAmount={available}
            onClose={() => setShowWithdraw(false)}
            onSubmitted={() => fetchMyWithdrawals()}
          />
        );
      })()}
    </div>
  );
};

export default Profile;
