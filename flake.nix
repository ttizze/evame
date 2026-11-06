{
  description = "Bun project environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "aarch64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          libsqlServer = pkgs.callPackage ./nix/libsql-server.nix { };
        in
        {
          default = pkgs.mkShellNoCC {
            packages = with pkgs; [
              bun
              just
              turso-cli
              libsqlServer
              nodejs_24
              typescript-language-server
            ];
          };
        }
      );

      formatter = forAllSystems (system: (import nixpkgs { inherit system; }).nixfmt-tree);
    };
}
