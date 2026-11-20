# Git: những sai sót đã gặp và quy trình để tránh lặp lại

*Ghi lại sau sự cố ngày 20/11/2026: commit bị push thẳng lên `main` thay vì qua Pull Request, nhánh `feature/c-map-khung` tụt 12 commit so với `main` và có 6 commit chưa push.*

Tình huống này không do một lỗi lớn nào gây ra. Nó là kết quả của nhiều giả định nhỏ chồng lên nhau, trong đó có cả sai sót trong cách Claude hướng dẫn.

## Những sai sót và giả định sai

**1. Làm việc ở thư mục ngoài repo rồi copy vào** *(lỗi trong cách hướng dẫn)*
Ban đầu code được viết trong `VNMap`, một thư mục không phải repo của nhóm, rồi copy file sang `VietNamTrip`. Hướng dẫn đã đi theo hướng đó thay vì clone repo và làm thẳng bên trong ngay từ đầu. Hệ quả: có 2 bản code song song (`Map/` và `web/`), lẫn lộn bản nào là mới nhất.

**2. Giả định "mình đang ở nhánh feature"** *(cả hai cùng mắc)*
Lần trước đang ở `feature/c-map-khung`. Giữa chừng chuyển sang `main` (có thể để xem code mới của nhóm) rồi làm tiếp ở đó. Khi hướng dẫn push, Claude có dặn kiểm tra dấu `*`, nhưng lại mặc định là vẫn ở nhánh feature mà không yêu cầu gửi kết quả để xác nhận.

**3. Giả định "`git pull` lấy code mới của nhóm"** *(lỗi của Claude)*
`git pull` chỉ cập nhật nhánh mà nhánh hiện tại đang theo dõi, không lấy code mới từ `main`. Muốn có code `main` thì phải `git fetch` rồi `git merge origin/main`.

**4. Giả định "`git push` sẽ đẩy lên nhánh của mình"**
`git push` đẩy lên nhánh mà **nhánh hiện tại** theo dõi. Đang đứng ở `main` nên nó đẩy thẳng lên `main`. Git không hỏi lại, và GitHub cũng không chặn vì `main` chưa được bảo vệ.

**5. Nhánh feature sống quá lâu mà không đồng bộ**
Nhánh tụt lại 12 commit so với `main`, và có 6 commit nằm trên máy chưa từng push. Càng để lâu, hai bên càng lệch nhau, và đến lúc gộp càng khó.

**6. Repo git bị tạo nhầm ở thư mục home**
Ai đó đã chạy `git init` ở `/Users/tranngan`, khiến lệnh git chạy ở đâu cũng "có repo", nên lỗi không bị phát hiện sớm. Đã gỡ bằng cách đổi tên `~/.git` thành `~/.git-nham`.

**Gốc chung của tất cả:** không biết chắc **mình đang ở nhánh nào** và **push sẽ đi đâu**.

---

## Cách tránh lặp lại

### A. Một quy trình cố định cho mỗi giai đoạn

```bash
# Bắt đầu giai đoạn mới
git checkout main
git pull
git checkout -b feature/ten-giai-doan
git push -u origin feature/ten-giai-doan

# Trong lúc làm (lặp lại nhiều lần)
git branch                # xác nhận dấu * KHÔNG ở main
git add .
git commit -m "mô tả rõ ràng"
git push

# Trước khi tạo Pull Request
git fetch
git merge origin/main     # kéo code mới của nhóm vào, sửa conflict nếu có
git push
# → lên GitHub tạo Pull Request

# Sau khi PR được merge
git checkout main
git pull
git branch -d feature/ten-giai-doan
```

Nếu theo đúng quy trình này thì `git add .` và `git commit -m` là đủ, không cần xử lý gì thêm.

### B. Luôn nhìn tên nhánh trước khi commit
Góc trái dưới VS Code luôn hiện tên nhánh hiện tại. Tập thói quen liếc qua đó trước mỗi lần commit. Thấy `main` là dừng lại.

### C. Bảo vệ nhánh `main` trên GitHub (cách chắc chắn nhất)
Chủ repo vào **Settings → Branches → Add branch protection rule**, nhập `main`, tick **Require a pull request before merging**. Từ đó GitHub sẽ từ chối mọi lệnh push thẳng lên `main`, của bất kỳ ai trong nhóm.

### D. Push thường xuyên, mỗi giai đoạn một nhánh ngắn
Làm xong phần nào thì commit và push phần đó, đừng để commit tích trên máy. Mỗi giai đoạn dùng một nhánh mới, merge xong thì xóa.

### E. Commit message rõ ràng
Viết kiểu `"Thêm popup ảnh khi bấm vào tỉnh"`, đừng ghi `"abcxyz"`. Khi cần tìm lại hay sửa lỗi, message rõ sẽ giúp cả nhóm biết commit nào làm gì.

---

**Cam kết của Claude:** trước khi đưa lệnh `push` hay `merge`, Claude sẽ yêu cầu gửi kết quả `git branch -vv` để xác nhận nhánh, thay vì mặc định là đang ở đúng nhánh.
