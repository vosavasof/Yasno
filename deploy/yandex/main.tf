terraform {
  required_version = ">= 1.5"
  required_providers {
    yandex = {
      source  = "yandex-cloud/yandex"
      version = "~> 0.135"
    }
  }
}
provider "yandex" {
  folder_id = var.folder_id
  zone      = var.zone
}
variable "folder_id" { type = string }
variable "zone" {
  type    = string
  default = "ru-central1-a"
}
variable "domain" {
  type = string
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9.-]+\\.[a-z]{2,}$", var.domain))
    error_message = "Укажите домен в ASCII/punycode без https:// и пути."
  }
}
variable "ssh_public_key_path" { type = string }
variable "admin_cidr" {
  type = string
  validation {
    condition     = can(cidrhost(var.admin_cidr, 0)) && var.admin_cidr != "0.0.0.0/0"
    error_message = "SSH разрешается только с вашего IP/CIDR."
  }
}
variable "revision" {
  type    = string
  default = "main"
  validation {
    condition     = can(regex("^[a-zA-Z0-9][a-zA-Z0-9._/-]*$", var.revision))
    error_message = "Укажите ветку, тег или SHA коммита."
  }
}
resource "yandex_vpc_network" "app" { name = "yasna-network" }
resource "yandex_vpc_subnet" "app" {
  name           = "yasna-subnet"
  zone           = var.zone
  network_id     = yandex_vpc_network.app.id
  v4_cidr_blocks = ["10.31.0.0/24"]
}
resource "yandex_vpc_address" "app" {
  name = "yasna-public-address"
  external_ipv4_address { zone_id = var.zone }
}
resource "yandex_vpc_security_group" "app" {
  name       = "yasna-security"
  network_id = yandex_vpc_network.app.id
  ingress {
    protocol       = "TCP"
    port           = 22
    v4_cidr_blocks = [var.admin_cidr]
  }
  ingress {
    protocol       = "TCP"
    port           = 80
    v4_cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    protocol       = "TCP"
    port           = 443
    v4_cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    protocol       = "ANY"
    v4_cidr_blocks = ["0.0.0.0/0"]
  }
}
data "yandex_compute_image" "ubuntu" {
  family = "ubuntu-2404-lts"
}
resource "yandex_compute_instance" "app" {
  name        = "yasna-app"
  zone        = var.zone
  platform_id = "standard-v3"
  resources {
    cores         = 2
    memory        = 2
    core_fraction = 20
  }
  boot_disk {
    initialize_params {
      image_id = data.yandex_compute_image.ubuntu.id
      size     = 20
      type     = "network-ssd"
    }
  }
  network_interface {
    subnet_id          = yandex_vpc_subnet.app.id
    nat                = true
    nat_ip_address     = yandex_vpc_address.app.external_ipv4_address[0].address
    security_group_ids = [yandex_vpc_security_group.app.id]
  }
  metadata = {
    user-data = templatefile("${path.module}/cloud-init.yml.tftpl", {
      domain         = var.domain
      revision       = var.revision
      ssh_public_key = trimspace(file(var.ssh_public_key_path))
    })
  }
}
output "public_ip" { value = yandex_vpc_address.app.external_ipv4_address[0].address }
output "site_url" { value = "https://${var.domain}" }
