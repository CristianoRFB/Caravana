//go:build ignore

// Synthetic-only age interoperability check. Run in a temporary module with
// filippo.io/age v1.3.2. No network, credentials, real data or key files here.
package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"io"
	"os"

	"filippo.io/age"
)

func decrypt(ciphertext []byte, identity age.Identity) ([]byte, error) {
	r, err := age.Decrypt(bytes.NewReader(ciphertext), identity)
	if err != nil { return nil, err }
	return io.ReadAll(r) // Authentication must succeed through EOF.
}

func main() {
	checks := map[string]bool{}
	identity, err := age.GenerateX25519Identity()
	if err != nil { os.Exit(1) }
	wrong, err := age.GenerateX25519Identity()
	if err != nil { os.Exit(1) }
	// Crosses multiple age chunks and includes binary/UTF-8 content.
	plain := bytes.Repeat([]byte("SYNTHETIC_ONLY_Caravana77_ação\x00\xff"), 9000)
	var encrypted bytes.Buffer
	w, err := age.Encrypt(&encrypted, identity.Recipient())
	if err != nil { os.Exit(1) }
	_, err = io.Copy(w, bytes.NewReader(plain))
	if err != nil { os.Exit(1) }
	if err = w.Close(); err != nil { os.Exit(1) }
	ciphertext := encrypted.Bytes()
	restored, err := decrypt(ciphertext, identity)
	checks["fullRoundtrip"] = err == nil && bytes.Equal(restored, plain)
	checks["sha256Identical"] = sha256.Sum256(restored) == sha256.Sum256(plain)
	checks["plaintextAbsentFromCiphertext"] = !bytes.Contains(ciphertext, plain[:256])
	_, err = decrypt(ciphertext, wrong)
	checks["wrongKeyRejected"] = err != nil
	tampered := bytes.Clone(ciphertext)
	tampered[len(tampered)-1] ^= 1
	_, err = decrypt(tampered, identity)
	checks["tamperRejected"] = err != nil
	_, err = decrypt(ciphertext[:len(ciphertext)-1], identity)
	checks["truncationRejected"] = err != nil
	_, err = decrypt(append(bytes.Clone(ciphertext), 1), identity)
	checks["trailingDataRejected"] = err != nil
	checks["officialFormatHeader"] = bytes.HasPrefix(ciphertext, []byte("age-encryption.org/v1\n"))
	passed := true
	for _, ok := range checks { passed = passed && ok }
	status := "PASS_SYNTHETIC_CRYPTO_ONLY"
	if !passed { status = "FAIL_SYNTHETIC_CRYPTO" }
	json.NewEncoder(os.Stdout).Encode(map[string]any{
		"status": status, "ageVersion": "v1.3.2", "checks": checks,
		"rawFilesCreated": 0, "keyFilesCreated": 0, "realDataRead": false,
		"ownerKeyCustodyVerified": false, "realBackupCreated": false,
		"realRestoreVerified": false,
	})
	if !passed { os.Exit(1) }
}
