# streamlit_app.py — Cổng thông tin Quản lý Lớp học (Streamlit Edition)
import os
import sqlite3
import pandas as pd
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go

st.set_page_config(
    page_title="EduClass Hub — Quản lý Lớp học Thông minh",
    page_icon="🏫",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS for modern UI
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap');
    html, body, [class*="css"] {
        font-family: 'Be Vietnam Pro', sans-serif;
    }
    .metric-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 16px 20px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        margin-bottom: 12px;
    }
    .metric-val {
        font-size: 24px;
        font-weight: 800;
        color: #105abc;
    }
    .metric-lbl {
        font-size: 13px;
        color: #64748b;
        font-weight: 600;
    }
</style>
""", unsafe_allow_html=True)

# Database Connection
DB_PATH = os.path.join(os.path.dirname(__file__), "prisma", "dev.db")

def get_db():
    if not os.path.exists(DB_PATH):
        st.error(f"Không tìm thấy cơ sở dữ liệu tại {DB_PATH}")
        return None
    return sqlite3.connect(DB_PATH)

# Sidebar
st.sidebar.image("https://img.icons8.com/fluent/96/school.png", width=64)
st.sidebar.title("🏫 EduClass Hub")
st.sidebar.markdown("**Hệ thống Quản lý Lớp học Đa Lớp**")

conn = get_db()
classList = ["12T2", "11AT3"]
if conn:
    try:
        classes_df = pd.read_sql("SELECT DISTINCT lop FROM Student WHERE lop IS NOT NULL AND lop != '' ORDER BY lop ASC", conn)
        if not classes_df.empty:
            classList = classes_df["lop"].tolist()
    except Exception:
        pass

selected_class = st.sidebar.selectbox("🎯 Chọn Lớp Quản lý:", ["Tất cả các lớp"] + classList)

menu = st.sidebar.radio(
    "📌 Chức năng chính:",
    ["📊 Tổng quan Dashboard", "👥 Danh sách Học sinh", "📋 Điểm danh", "💰 Sổ quỹ lớp", "🧹 Lịch trực nhật", "🌟 Sự kiện lớp", "🌐 Về Web Next.js"]
)

st.sidebar.markdown("---")
st.sidebar.caption("Phiên bản: v2.5.0 • Triển khai đa nền tảng")

if not conn:
    st.warning("Vui lòng kiểm tra lại file CSDL `prisma/dev.db`.")
    st.stop()

# Helper query filter
class_filter = "" if selected_class == "Tất cả các lớp" else f"WHERE lop = '{selected_class}'"
student_class_filter = "" if selected_class == "Tất cả các lớp" else f"WHERE s.lop = '{selected_class}'"

# ==========================================
# 1. TỔNG QUAN DASHBOARD
# ==========================================
if menu == "📊 Tổng quan Dashboard":
    st.title(f"📊 Tổng quan — {selected_class}")
    st.markdown("Số liệu thời gian thực được đồng bộ trực tiếp từ hệ thống CSDL.")

    # Query KPIs
    c1, c2, c3, c4 = st.columns(4)
    
    total_students = pd.read_sql(f"SELECT COUNT(*) as c FROM Student {class_filter}", conn).iloc[0]["c"]
    total_attendance = pd.read_sql(f"SELECT COUNT(*) as c FROM Attendance a JOIN Student s ON a.studentId = s.id {student_class_filter}", conn).iloc[0]["c"]
    
    fee_df = pd.read_sql(f"SELECT f.soTien, f.trangThai FROM FeeCollection f JOIN Student s ON f.studentId = s.id {student_class_filter}", conn)
    tong_thu = fee_df[fee_df["trangThai"] == "Đã Đóng"]["soTien"].sum() if not fee_df.empty else 0
    
    expense_df = pd.read_sql("SELECT SUM(thanhTien) as c FROM Expense", conn)
    tong_chi = expense_df.iloc[0]["c"] if not expense_df.empty and expense_df.iloc[0]["c"] is not None else 0
    con_lai = tong_thu - tong_chi

    with c1:
        st.markdown(f"""<div class="metric-card"><div class="metric-lbl">Tổng số học sinh</div><div class="metric-val">{total_students} HS</div></div>""", unsafe_allow_html=True)
    with c2:
        st.markdown(f"""<div class="metric-card"><div class="metric-lbl">Lượt ghi nhận điểm danh</div><div class="metric-val">{total_attendance} lượt</div></div>""", unsafe_allow_html=True)
    with c3:
        st.markdown(f"""<div class="metric-card"><div class="metric-lbl">Tổng quỹ thu được</div><div class="metric-val" style="color:#10b981;">{tong_thu:,.0f} ₫</div></div>""", unsafe_allow_html=True)
    with c4:
        st.markdown(f"""<div class="metric-card"><div class="metric-lbl">Số dư quỹ còn lại</div><div class="metric-val" style="color:#f59e0b;">{con_lai:,.0f} ₫</div></div>""", unsafe_allow_html=True)

    col_chart1, col_chart2 = st.columns(2)
    with col_chart1:
        st.subheader("💰 Thu chi Quỹ lớp")
        fig_fee = go.Figure(data=[
            go.Bar(name='Tổng thu', x=['Quỹ lớp'], y=[tong_thu], marker_color='#10b981'),
            go.Bar(name='Tổng chi', x=['Quỹ lớp'], y=[tong_chi], marker_color='#ef4444'),
            go.Bar(name='Số dư', x=['Quỹ lớp'], y=[con_lai], marker_color='#3b82f6')
        ])
        fig_fee.update_layout(barmode='group', height=320, margin=dict(l=20, r=20, t=30, b=20))
        st.plotly_chart(fig_fee, use_container_width=True)

    with col_chart2:
        st.subheader("👥 Phân bố học sinh theo Tổ")
        to_df = pd.read_sql(f"SELECT `to`, COUNT(*) as sl FROM Student {class_filter} GROUP BY `to` ORDER BY `to` ASC", conn)
        if not to_df.empty:
            to_df["to_lbl"] = to_df["to"].apply(lambda x: f"Tổ {x}")
            fig_to = px.pie(to_df, values='sl', names='to_lbl', hole=0.4, color_discrete_sequence=['#105abc', '#10b981', '#f59e0b', '#8b5cf6'])
            fig_to.update_layout(height=320, margin=dict(l=20, r=20, t=30, b=20))
            st.plotly_chart(fig_to, use_container_width=True)
        else:
            st.info("Chưa có dữ liệu phân tổ.")

# ==========================================
# 2. DANH SÁCH HỌC SINH
# ==========================================
elif menu == "👥 Danh sách Học sinh":
    st.title(f"👥 Danh sách Học sinh — {selected_class}")
    
    search = st.text_input("🔍 Tìm kiếm theo họ tên hoặc tên gọi:", "")
    to_filter = st.selectbox("Lọc theo Tổ:", ["Tất cả các tổ", "Tổ 1", "Tổ 2", "Tổ 3", "Tổ 4"])
    
    query = f"SELECT id, hoTen as 'Họ và tên', tenGoi as 'Tên gọi', gioiTinh as 'Giới tính', `to` as 'Tổ', lop as 'Lớp', ghiChu as 'Ghi chú' FROM Student {class_filter}"
    if class_filter == "":
        where_clauses = []
    else:
        where_clauses = [f"lop = '{selected_class}'"]
        
    if to_filter != "Tất cả các tổ":
        to_num = int(to_filter.replace("Tổ ", ""))
        where_clauses.append(f"`to` = {to_num}")
        
    if search.strip():
        where_clauses.append(f"(hoTen LIKE '%{search.strip()}%' OR tenGoi LIKE '%{search.strip()}%')")
        
    final_query = "SELECT id as 'Mã HS', hoTen as 'Họ và tên', tenGoi as 'Tên gọi', gioiTinh as 'Giới tính', `to` as 'Tổ', lop as 'Lớp', ghiChu as 'Ghi chú' FROM Student"
    if where_clauses:
        final_query += " WHERE " + " AND ".join(where_clauses)
    final_query += " ORDER BY `to` ASC, hoTen ASC"
    
    df_students = pd.read_sql(final_query, conn)
    st.write(f"**Tổng số:** {len(df_students)} học sinh")
    st.dataframe(df_students, use_container_width=True, hide_index=True)
    
    # Export CSV
    csv = df_students.to_csv(index=False).encode('utf-8-sig')
    st.download_button("📥 Tải file CSV danh sách", data=csv, file_name=f"danh_sach_hoc_sinh_{selected_class}.csv", mime="text/csv")

# ==========================================
# 3. ĐIỂM DANH
# ==========================================
elif menu == "📋 Điểm danh":
    st.title(f"📋 Báo cáo Điểm danh — {selected_class}")
    
    att_query = f"""
    SELECT a.id, s.hoTen as 'Họ và tên', s.lop as 'Lớp', s.`to` as 'Tổ', 
           strftime('%d/%m/%Y', a.ngay) as 'Ngày', a.loai as 'Trạng thái', a.ghiChu as 'Ghi chú'
    FROM Attendance a 
    JOIN Student s ON a.studentId = s.id
    {student_class_filter}
    ORDER BY a.ngay DESC, s.hoTen ASC
    """
    df_att = pd.read_sql(att_query, conn)
    
    if not df_att.empty:
        col1, col2 = st.columns([2, 1])
        with col1:
            st.dataframe(df_att, use_container_width=True, hide_index=True)
        with col2:
            st.subheader("Phân bố chuyên cần")
            stat_df = df_att['Trạng thái'].value_counts().reset_index()
            stat_df.columns = ['Trạng thái', 'Số lượng']
            fig_att = px.pie(stat_df, values='Số lượng', names='Trạng thái', color='Trạng thái',
                             color_discrete_map={"Vắng có phép": "#f59e0b", "Vắng không phép": "#ef4444", "Đi trễ": "#3b82f6"})
            st.plotly_chart(fig_att, use_container_width=True)
    else:
        st.info("Chưa có ghi nhận vắng/trễ nào cho lớp này.")

# ==========================================
# 4. SỔ QUỸ LỚP
# ==========================================
elif menu == "💰 Sổ quỹ lớp":
    st.title(f"💰 Sổ quỹ lớp — {selected_class}")
    
    tab1, tab2 = st.tabs(["💵 Danh sách Thu Quỹ", "🧾 Danh sách Khoản Chi"])
    
    with tab1:
        fee_q = f"""
        SELECT s.hoTen as 'Họ và tên', s.lop as 'Lớp', s.`to` as 'Tổ', 
               f.kyThu as 'Kỳ thu', f.soTien as 'Số tiền (VNĐ)', f.trangThai as 'Trạng thái',
               f.hinhThucDong as 'Hình thức'
        FROM FeeCollection f
        JOIN Student s ON f.studentId = s.id
        {student_class_filter}
        ORDER BY f.trangThai DESC, s.hoTen ASC
        """
        df_fees = pd.read_sql(fee_q, conn)
        st.dataframe(df_fees, use_container_width=True, hide_index=True)
        
    with tab2:
        exp_q = """
        SELECT danhSachChi as 'Nội dung chi', hangMucChi as 'Hạng mục', 
               soLuong as 'Số lượng', donGia as 'Đơn giá', thanhTien as 'Thành tiền (VNĐ)',
               strftime('%d/%m/%Y', ngayChi) as 'Ngày chi', ghiChu as 'Ghi chú'
        FROM Expense
        ORDER BY ngayChi DESC
        """
        df_exp = pd.read_sql(exp_q, conn)
        st.dataframe(df_exp, use_container_width=True, hide_index=True)

# ==========================================
# 5. LỊCH TRỰC NHẬT
# ==========================================
elif menu == "🧹 Lịch trực nhật":
    st.title(f"🧹 Phân công Lịch trực nhật — {selected_class}")
    
    duty_q = f"""
    SELECT d.thu as 'Thứ', s.hoTen as 'Học sinh trực', s.lop as 'Lớp', s.`to` as 'Tổ', d.tuan as 'Tuần'
    FROM DutyRoster d
    JOIN Student s ON d.studentId = s.id
    {student_class_filter}
    ORDER BY d.thuOrder ASC, s.hoTen ASC
    """
    df_duty = pd.read_sql(duty_q, conn)
    if not df_duty.empty:
        st.dataframe(df_duty, use_container_width=True, hide_index=True)
    else:
        st.info("Chưa có lịch trực nhật được phân công.")

# ==========================================
# 6. SỰ KIỆN LỚP
# ==========================================
elif menu == "🌟 Sự kiện lớp":
    st.title("🌟 Kế hoạch & Sự kiện Lớp học")
    ev_df = pd.read_sql("SELECT tenSuKien as 'Tên sự kiện', hangMuc as 'Hạng mục', chiTiet as 'Chi tiết', strftime('%d/%m/%Y', deadline) as 'Hạn chót', trangThai as 'Trạng thái' FROM Event ORDER BY deadline ASC", conn)
    if not ev_df.empty:
        st.dataframe(ev_df, use_container_width=True, hide_index=True)
    else:
        st.info("Chưa có sự kiện nào.")

# ==========================================
# 7. VỀ WEB NEXT.JS
# ==========================================
elif menu == "🌐 Về Web Next.js":
    st.title("🌐 Hệ thống Web Next.js Full-Stack")
    st.markdown("""
    Ứng dụng này đi kèm với hệ thống **Next.js 16 (React + TypeScript + TailwindCSS + NextAuth v5)** cao cấp nhất:
    * 📱 **Trang học sinh**: Tra cứu điểm danh, quỹ lớp, lịch trực nhật tức thì.
    * 💼 **Trang Quản trị Admin**: Phân quyền chi tiết, import/export Excel, thiết lập số tiền thu 1 chạm.
    * 🚀 **Triển khai Production**: Có thể deploy 1-click lên [Vercel](https://vercel.com).
    """)
    st.info("Mã nguồn đầy đủ đã được đẩy lên GitHub Repository: https://github.com/henrytrinhcongtruong-hash/Quanlihocvien.git")
