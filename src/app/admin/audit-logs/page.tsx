const snap = await getDocs(
  query(
    collection(db, "admin_audit_logs"),
    orderBy("timestamp", "desc"),
    limit(50)
  )
);
