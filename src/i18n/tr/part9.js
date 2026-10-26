// Turkish translations, part 9: the staff application page, creating and
// deleting user accounts, and recording vital signs.

export default {
  // Staff application
  "Staff Application": "Personel Başvurusu",
  "Apply for a staff account": "Personel hesabı için başvurun",
  "An administrator reviews every application before an account is created.":
    "Hesap oluşturulmadan önce her başvuruyu bir yönetici inceler.",
  "Doctor or medical staff?": "Doktor veya sağlık personeli misiniz?",
  "Apply for an account": "Hesap için başvurun",
  "Join Our Clinical Team": "Klinik Ekibimize Katılın",
  "Apply to practise": "Kliniğimizde çalışmak",
  "with our clinic.": "için başvurun.",
  "Doctors and medical staff do not register directly. Send your credentials here and an administrator will review them.":
    "Doktorlar ve sağlık personeli doğrudan kayıt olmaz. Belgelerinizi buradan gönderin, bir yönetici inceleyecektir.",
  "Submit your credentials": "Belgelerinizi gönderin",
  "Licence, qualifications and supporting documents.":
    "Lisans, yeterlilikler ve destekleyici belgeler.",
  "Administrator review": "Yönetici incelemesi",
  "Your account is created once the application is approved.":
    "Başvurunuz onaylandığında hesabınız oluşturulur.",
  "Application failed": "Başvuru başarısız",
  "Application submitted": "Başvuru gönderildi",
  "Your application for": "Şu adres için başvurunuz:",
  "is now waiting for review. You will be able to sign in once an administrator approves it.":
    "inceleme bekliyor. Bir yönetici onayladığında giriş yapabileceksiniz.",
  "Back to Sign In": "Girişe Dön",
  "This email already has an application under review.":
    "Bu e-posta için incelenen bir başvuru zaten var.",
  "An application for this email is already waiting for review.":
    "Bu e-posta için bir başvuru zaten inceleme bekliyor.",
  Position: "Pozisyon",
  "Select a position": "Bir pozisyon seçin",
  "License Number": "Lisans Numarası",
  "Years of Experience": "Deneyim Yılı",
  "MD, Pediatrics Residency — Ankara University":
    "Tıp Doktoru, Çocuk Sağlığı Uzmanlığı — Ankara Üniversitesi",
  "Supporting Documents": "Destekleyici Belgeler",
  "Your licence, CV and any other proof. PDF, JPG or PNG, up to {count} files of 10 MB each.":
    "Lisansınız, özgeçmişiniz ve diğer belgeleriniz. PDF, JPG veya PNG, her biri 10 MB'a kadar en fazla {count} dosya.",
  "Attach at least one supporting document.":
    "En az bir destekleyici belge ekleyin.",
  "Attach at most {count} documents.": "En fazla {count} belge ekleyin.",
  "{name} is not a PDF, JPG or PNG file.":
    "{name} bir PDF, JPG veya PNG dosyası değil.",
  "{name} is larger than 10 MB.": "{name} 10 MB'tan büyük.",
  "Each document must be 10 MB or smaller.":
    "Her belge en fazla 10 MB olmalıdır.",
  "Documents must be PDF, JPG or PNG files.":
    "Belgeler PDF, JPG veya PNG dosyası olmalıdır.",
  "No file was uploaded with this application.":
    "Bu başvuruyla birlikte dosya yüklenmedi.",
  "name only": "yalnızca ad",
  "This document could not be downloaded.": "Bu belge indirilemedi.",

  // Patient profile documents
  Download: "İndir",
  "Uploading...": "Yükleniyor...",
  "Choose a file to upload.": "Yüklenecek bir dosya seçin.",
  "You can keep at most {count} documents.":
    "En fazla {count} belge saklayabilirsiniz.",
  "Document not found.": "Belge bulunamadı.",
  "I confirm that the credentials above are mine and may be verified.":
    "Yukarıdaki bilgilerin bana ait olduğunu ve doğrulanabileceğini onaylıyorum.",
  "Submitting application...": "Başvuru gönderiliyor...",
  "Submit Application": "Başvuruyu Gönder",

  // Staff application validation
  "Select the position you are applying for.":
    "Başvurduğunuz pozisyonu seçin.",
  "Department is required.": "Bölüm gereklidir.",
  "License number is required.": "Lisans numarası gereklidir.",
  "Enter your years of experience (0–70).":
    "Deneyim yılınızı girin (0–70).",
  "Qualification is required.": "Yeterlilik gereklidir.",

  // Creating and deleting accounts
  "+ Add User": "+ Kullanıcı Ekle",
  "Add User": "Kullanıcı Ekle",
  "Temporary password": "Geçici şifre",
  "Give the temporary password to the account holder. They can change it with Forgot Password.":
    "Geçici şifreyi hesap sahibine verin. Şifremi Unuttum ile değiştirebilir.",
  "{name} was added.": "{name} eklendi.",
  "{name} was deleted.": "{name} silindi.",
  "Delete account?": "Hesap silinsin mi?",
  "{name} will be removed permanently. Accounts with appointments or medical records cannot be deleted — deactivate them instead.":
    "{name} kalıcı olarak kaldırılacak. Randevusu veya tıbbi kaydı olan hesaplar silinemez — bunun yerine devre dışı bırakın.",
  "You cannot delete your own account.": "Kendi hesabınızı silemezsiniz.",
  "This account has appointments or medical records and cannot be deleted. Deactivate it instead.":
    "Bu hesabın randevuları veya tıbbi kayıtları var ve silinemez. Bunun yerine devre dışı bırakın.",
  "Created user {id} ({name})": "{id} kullanıcısını oluşturdu ({name})",
  "Deleted user {id} ({name})": "{id} kullanıcısını sildi ({name})",

  // Vital signs
  "Record Vitals": "Yaşamsal Bulgu Kaydet",
  "Record Vital Signs": "Yaşamsal Bulguları Kaydet",
  "Enter the readings you measured. Leave a field empty if you did not measure it.":
    "Ölçtüğünüz değerleri girin. Ölçmediğiniz alanı boş bırakın.",
  "Heart rate (bpm)": "Kalp atış hızı (atım/dk)",
  "Blood pressure (mmHg)": "Kan basıncı (mmHg)",
  "Temperature (°C)": "Sıcaklık (°C)",
  "Oxygen saturation (%)": "Oksijen satürasyonu (%)",
  "Weight (kg)": "Kilo (kg)",
  "Date measured": "Ölçüm tarihi",
  "Save Readings": "Ölçümleri Kaydet",
  "Vital signs were recorded.": "Yaşamsal bulgular kaydedildi.",
  "Recorded vital signs for {name}":
    "{name} için yaşamsal bulguları kaydetti",
  "Heart rate must be between 20 and 250 bpm.":
    "Kalp atış hızı 20 ile 250 atım/dk arasında olmalıdır.",
  "Temperature must be between 30 and 45 °C.":
    "Sıcaklık 30 ile 45 °C arasında olmalıdır.",
  "Oxygen saturation must be between 50 and 100%.":
    "Oksijen satürasyonu %50 ile %100 arasında olmalıdır.",
  "Weight must be between 1 and 500 kg.":
    "Kilo 1 ile 500 kg arasında olmalıdır.",
  "Blood pressure must look like 120/80.":
    "Kan basıncı 120/80 biçiminde olmalıdır.",
  "Select a date.": "Bir tarih seçin.",
  "Enter at least one reading.": "En az bir ölçüm girin.",
  "Only doctors can write to this part of the record.":
    "Kaydın bu bölümüne yalnızca doktorlar yazabilir.",
};
