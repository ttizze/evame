{
  description = "Digital Buddhism development environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [
        "aarch64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              bun
              nodejs
              just
              git
              cacert
              openssl
              pkg-config
              python3
            ];

            shellHook = ''
              echo "Digital Buddhism development shell: Bun, Node.js, and just are available."
              echo "Project CLI tools are installed from the Bun lockfile."
            '';
          };
        });
    };
}
