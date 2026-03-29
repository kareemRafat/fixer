Here are the directory trees for the MySQL and MariaDB versions currently on your Laragon installation. You can use
  these to build your app's auto-detection logic:

  1. Binaries (The engines)
  These contain the executables like mysqld.exe and mysql.exe:
   - C:\laragon\bin\mysql\mariadb-11.7.2-winx64\
   - C:\laragon\bin\mysql\mysql-8.0.30-winx64\

  2. Data (The actual databases)
  These are the files your app will need for a "row copy" (physical copy):
   - C:\laragon\data\mariadb-11.7\
   - C:\laragon\data\mysql-8\
   - C:\laragon\data\mysql\ (Usually the default/active version's data)

  Auto-Detection Tip for your App:
  To find out which version is currently active in Laragon, read this file:
   - C:\laragon\usr\laragon.ini

  Look for the [mysql] section:
   1 [mysql]
   2 Version=mysql-8.0.30-winx64
  This will tell your app exactly which engine is running and which data folder to target



 To fix the detection logic in your app, you should add C:\laragon to your "common locations" list.

  Laragon is almost always installed at the root of a drive (usually C:\laragon or D:\laragon). Here is the exact
  structure your app needs to look for to verify Laragon and locate MySQL:

  1. Detection Signature (How your app knows it's Laragon)
  Look for this file first. If it exists, you have found Laragon:
   - C:\laragon\laragon.exe

  2. Finding the Active MySQL Version
  Don't guess which MySQL folder to use. Laragon stores the "Active Version" in its configuration file. Your app should
  read this:
   - File: C:\laragon\usr\laragon.ini
   - Section: [mysql]
   - Key: Version

  I will now read that file for you so you can see the exact format to parse in your app.


Your app should now follow this pathing:

  1. Detection Path:
  C:\laragon\laragon.exe

  2. Config Parsing Path:
  C:\laragon\usr\laragon.ini

  3. The [mysql] Section:
   - DataDir=C:\laragon\data (This tells you where the database rows are stored).
   - Version=mysql-8.0.30-winx64 (This matches the folder name in C:\laragon\bin\mysql\).

  Resulting Absolute Paths for your App:
   - MySQL Binaries (Exes): C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\
   - MySQL Data (Rows): C:\laragon\data\mysql-8\ (or C:\laragon\data\mysql\)

  By using these values, your app can automatically detect any Laragon installation without the user needing to
  manually enter the paths!
