import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { apiRegister } from "../../lib/api";
import { saveToken } from "../../lib/auth";
import { LinearGradient } from "expo-linear-gradient"; 

type UserRole = "patient" | "doctor";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateEmail = (value: string) => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(value);
  };

  const validateName = (value: string) => {
    return /^[a-zA-Zа-яА-ЯёЁ\s-]+$/.test(value);
  };

  const validatePassword = (pw: string) => {
    if (pw.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(pw)) return "Password must include at least one uppercase letter";
    if (!/[a-z]/.test(pw)) return "Password must include at least one lowercase letter";
    if (!/[0-9]/.test(pw)) return "Password must include at least one number";
    if (!/[^A-Za-z0-9]/.test(pw)) return "Password must include at least one special character";
    return "";
  };

  const isValidDate = (year: number, month: number, day: number) => {
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!firstName.trim()) {
      newErrors.firstName = "Please enter your first name";
    } else if (firstName.trim().length < 2) {
      newErrors.firstName = "First name must be at least 2 characters";
    } else if (!validateName(firstName.trim())) {
      newErrors.firstName = "Name can only contain letters";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Please enter your last name";
    } else if (lastName.trim().length < 2) {
      newErrors.lastName = "Last name must be at least 2 characters";
    } else if (!validateName(lastName.trim())) {
      newErrors.lastName = "Name can only contain letters";
    }

    if (!email.trim() || !validateEmail(email.trim())) {
      newErrors.email = "Please enter a valid email";
    }

    const day = Number(birthDay);
    const month = Number(birthMonth);
    const year = Number(birthYear);
    const currentYear = new Date().getFullYear();

    if (
      !birthDay.trim() || !birthMonth.trim() || !birthYear.trim() ||
      Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)
    ) {
      newErrors.dateOfBirth = "Please enter your date of birth";
    } else if (day < 1 || day > 31) {
      newErrors.dateOfBirth = "Day must be between 1 and 31";
    } else if (month < 1 || month > 12) {
      newErrors.dateOfBirth = "Month must be between 1 and 12";
    } else if (!isValidDate(year, month, day)) {
      newErrors.dateOfBirth = "Please enter a valid date of birth";
    } else {
      const birthDate = new Date(year, month - 1, day);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (birthDate > today) {
        newErrors.dateOfBirth = "Date of birth cannot be in the future";
      } else if (age < 16) {
        newErrors.dateOfBirth = "You must be at least 16 years old to register";
      } else if (age > 120) {
        newErrors.dateOfBirth = "Please enter a valid year of birth";
      }
    }

    const heightNum = Number(height);
    if (!height.trim() || Number.isNaN(heightNum) || heightNum < 50 || heightNum > 250) {
      newErrors.height = "Height must be between 50 and 250 cm";
    }

    const weightNum = Number(weight);
    if (!weight.trim() || Number.isNaN(weightNum) || weightNum < 20 || weightNum > 350) {
      newErrors.weight = "Weight must be between 20 and 350 kg";
    }

    if (!password.trim()) {
      newErrors.password = "Please enter a password";
    } else {
      const pwError = validatePassword(password);
      if (pwError) {
        newErrors.password = pwError;
      }
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onRegister = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const day = Number(birthDay);
      const month = Number(birthMonth);
      const year = Number(birthYear);

      const dateOfBirth = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const heightNum = Number(height);
      const weightNum = Number(weight);
      
      const normalizedEmail = email.trim().toLowerCase();
      const computedRole: UserRole = normalizedEmail.endsWith("@doctor.dc") ? "doctor" : "patient";

      setLoading(true);

      const res = await apiRegister({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        dateOfBirth,
        role: computedRole,
        height: heightNum,
        weight: weightNum,
        password,
      });

      await saveToken(res.token);
      router.replace("/(tabs)/home" as any);
    } catch (e: any) {
      Alert.alert("Register failed", e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleNameInput = (text: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const filtered = text.replace(/[^a-zA-Zа-яА-ЯёЁ\s-]/g, "");
    setter(filtered);
  };

  return (
    <LinearGradient 
      colors={["#FFFFFF", "#DCEAEC"]} 
      style={s.container}
    >
      <ScrollView
        contentContainerStyle={s.screen}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          <Text style={s.title}>Create account</Text>
          <Text style={s.subtitle}>Join StepWell and start monitoring</Text>

          <Text style={s.label}>First name</Text>
          <TextInput
            style={[s.input, errors.firstName ? s.inputError : null]}
            placeholder="Your first name"
            placeholderTextColor="#9CA3AF"
            value={firstName}
            onChangeText={(text) => {
              handleNameInput(text, setFirstName);
              if (errors.firstName) setErrors(prev => ({ ...prev, firstName: "" }));
            }}
          />
          {errors.firstName && <Text style={s.error}>{errors.firstName}</Text>}

          <Text style={s.label}>Last name</Text>
          <TextInput
            style={[s.input, errors.lastName ? s.inputError : null]}
            placeholder="Your last name"
            placeholderTextColor="#9CA3AF"
            value={lastName}
            onChangeText={(text) => {
              handleNameInput(text, setLastName);
              if (errors.lastName) setErrors(prev => ({ ...prev, lastName: "" }));
            }}
          />
          {errors.lastName && <Text style={s.error}>{errors.lastName}</Text>}

          <Text style={s.label}>Email</Text>
          <TextInput
            style={[s.input, errors.email ? s.inputError : null]}
            placeholder="name@example.com"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
            }}
          />
          {errors.email && <Text style={s.error}>{errors.email}</Text>}

          <Text style={s.label}>Date of birth</Text>
          <View style={s.dateRow}>
            <TextInput
              style={[s.dateInput, errors.dateOfBirth ? s.inputError : null]}
              placeholder="DD"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              maxLength={2}
              value={birthDay}
              onChangeText={(text) => {
                setBirthDay(text);
                if (errors.dateOfBirth) setErrors(prev => ({ ...prev, dateOfBirth: "" }));
              }}
            />

            <TextInput
              style={[s.dateInput, errors.dateOfBirth ? s.inputError : null]}
              placeholder="MM"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              maxLength={2}
              value={birthMonth}
              onChangeText={(text) => {
                setBirthMonth(text);
                if (errors.dateOfBirth) setErrors(prev => ({ ...prev, dateOfBirth: "" }));
              }}
            />

            <TextInput
              style={[s.dateInput, errors.dateOfBirth ? s.inputError : null]}
              placeholder="YYYY"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              maxLength={4}
              value={birthYear}
              onChangeText={(text) => {
                setBirthYear(text);
                if (errors.dateOfBirth) setErrors(prev => ({ ...prev, dateOfBirth: "" }));
              }}
            />
          </View>
          {errors.dateOfBirth && <Text style={s.error}>{errors.dateOfBirth}</Text>}

          <Text style={s.label}>Height (cm)</Text>
          <TextInput
            style={[s.input, errors.height ? s.inputError : null]}
            placeholder="e.g. 175"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={height}
            onChangeText={(text) => {
              setHeight(text);
              if (errors.height) setErrors(prev => ({ ...prev, height: "" }));
            }}
          />
          {errors.height && <Text style={s.error}>{errors.height}</Text>}

          <Text style={s.label}>Weight (kg)</Text>
          <TextInput
            style={[s.input, errors.weight ? s.inputError : null]}
            placeholder="e.g. 72"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={weight}
            onChangeText={(text) => {
              setWeight(text);
              if (errors.weight) setErrors(prev => ({ ...prev, weight: "" }));
            }}
          />
          {errors.weight && <Text style={s.error}>{errors.weight}</Text>}

          <Text style={s.label}>Password</Text>
          <TextInput
            style={[s.input, errors.password ? s.inputError : null]}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors(prev => ({ ...prev, password: "" }));
            }}
          />
          {errors.password && <Text style={s.error}>{errors.password}</Text>}

          <Text style={s.label}>Confirm password</Text>
          <TextInput
            style={[s.input, errors.confirmPassword ? s.inputError : null]}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: "" }));
            }}
          />
          {errors.confirmPassword && <Text style={s.error}>{errors.confirmPassword}</Text>}

          <Pressable
            style={({ pressed }) => [
              s.primaryBtn,
              pressed && Platform.OS !== "web" ? { opacity: 0.9 } : null,
              loading ? { opacity: 0.7 } : null,
            ]}
            onPress={onRegister}
            disabled={loading}
          >
            <Text style={s.primaryBtnText}>
              {loading ? "Creating..." : "Create account"}
            </Text>
          </Pressable>

          <View style={s.row}>
            <Text style={s.muted}>Already have an account?</Text>
            <Pressable onPress={() => router.replace("/(tabs)/login" as any)}>
              <Text style={s.link}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28, 
    borderWidth: 1,
    borderColor: "#E8EEF2",
    ...Platform.select({
      web: { boxShadow: "0px 12px 40px rgba(30, 111, 120, 0.08)" as any }, 
      default: { elevation: 6 },
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1E6F78", 
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 22,
    color: "#6A8085",
    fontSize: 14,
    fontWeight: "600",
  },
  label: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 13,
    color: "#20363A",
    fontWeight: "800",
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: "#DCEAEC",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 16,
    color: "#20363A",
    fontSize: 15,
    fontWeight: "600",
  },
  inputError: {
    borderColor: "#FF3B30",
  },
  error: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#FF3B30",
  },
  dateRow: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
  },
  dateInput: {
    flex: 1,
    minWidth: 0,
    height: 48,
    borderWidth: 1.5,
    borderColor: "#DCEAEC",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 12,
    color: "#20363A",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  primaryBtn: {
    marginTop: 24,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#1E6F78",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  row: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  muted: {
    color: "#6A8085",
    fontSize: 14,
    fontWeight: "600",
  },
  link: {
    color: "#1E6F78",
    fontSize: 14,
    fontWeight: "900",
  },
});