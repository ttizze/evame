{
  lib,
  stdenv,
  stdenvNoCC,
  fetchurl,
  autoPatchelfHook,
  openssl,
  zlib,
}:

let
  builds = {
    aarch64-darwin = {
      target = "aarch64-apple-darwin";
      sha256 = "ced2a9d65a5d4b6bd72c67e98ad6c63139e2a139d91769f07fdd15be935381dd";
    };
    aarch64-linux = {
      target = "aarch64-unknown-linux-gnu";
      sha256 = "37f9eee45b388a30192907ecf4565b93df945c079331657073b5b3caf8bb1cd0";
    };
    x86_64-linux = {
      target = "x86_64-unknown-linux-gnu";
      sha256 = "71720fc8648c19efef416efebd47145ef59b62e198770533530a858e1336879f";
    };
  };
  build = builds.${stdenv.hostPlatform.system};
in
stdenvNoCC.mkDerivation rec {
  pname = "libsql-server";
  version = "0.24.32";
  src = fetchurl {
    url = "https://github.com/tursodatabase/libsql/releases/download/libsql-server-v${version}/libsql-server-${build.target}.tar.xz";
    inherit (build) sha256;
  };
  sourceRoot = "libsql-server-${build.target}";
  dontConfigure = true;
  dontBuild = true;
  dontStrip = true;
  nativeBuildInputs = lib.optionals stdenv.hostPlatform.isLinux [ autoPatchelfHook ];
  buildInputs = lib.optionals stdenv.hostPlatform.isLinux [
    openssl
    zlib
    stdenv.cc.cc.lib
  ];
  installPhase = ''
    runHook preInstall
    mkdir -p "$out/bin"
    install -m755 sqld "$out/bin/sqld"
    runHook postInstall
  '';
  meta = {
    description = "Pinned libSQL HTTP server for local development and tests";
    homepage = "https://github.com/tursodatabase/libsql";
    platforms = builtins.attrNames builds;
  };
}
